import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { tariffId } = await req.json();

    if (!tariffId) {
      throw new Error("Missing tariffId");
    }

    const { data: tariff, error: tariffError } = await supabase
      .from("tariffs")
      .select("*")
      .eq("id", tariffId)
      .single();

    if (tariffError || !tariff) {
      throw new Error("Tariff not found");
    }

    if (!tariff.file_url) {
      throw new Error("No document attached to this tariff");
    }

    console.log('Creating signed URL for file:', tariff.file_url);

    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(tariff.file_url, 600);

    if (signedError || !signedUrlData?.signedUrl) {
      throw new Error('Failed to create signed URL');
    }

    const publicUrl = signedUrlData.signedUrl;
    console.log('Using public URL for analysis');

    const fileName = tariff.file_name || tariff.file_url.split('/').pop() || 'document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';

    console.log('File type:', fileExtension);

    let summary = '';

    if (isPDF) {
      console.log('Processing PDF with OpenAI vision...');
      
      try {
        const promptText = 'You are a logistics and transportation expert. Analyze this tariff document PDF and provide a detailed, comprehensive summary. IMPORTANT: Extract SPECIFIC information from the document - actual rates, dates, percentages, dollar amounts, contact names, etc. Do NOT give generic templates. Required Analysis: 1. Carrier & Service Details: Exact carrier name as shown in document, Service types offered, Transportation modes. 2. Rate Structure: Specific rates, Pricing tiers with actual numbers, Fuel surcharge percentage or formula, Any minimum charges. 3. Geographic Coverage: Specific states, regions, zip codes, or cities, Lane descriptions, Service area boundaries. 4. Effective Dates: Exact start date, Exact end date, Contract duration, Renewal terms. 5. Key Terms & Conditions: Payment terms, Liability limits, Insurance requirements, Claims procedures. 6. Notable Features: Volume discounts, Performance incentives, Special services included, Restrictions or exclusions. Provide a detailed summary with all specific information you can extract.';
        
        const parseResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + openaiKey,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: promptText
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: publicUrl,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          }),
        });

        if (!parseResponse.ok) {
          const errorText = await parseResponse.text();
          console.error('PDF parsing error:', errorText);
          throw new Error('Failed to parse PDF');
        }

        const parseResult = await parseResponse.json();
        summary = parseResult.choices[0]?.message?.content || "Unable to parse PDF";
        
        console.log('Successfully parsed PDF, summary length:', summary.length);
      } catch (parseError) {
        console.error('PDF parsing failed:', parseError);
        throw parseError;
      }
    } else {
      console.log('Processing non-PDF document...');
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(tariff.file_url);

      if (downloadError) {
        throw downloadError;
      }

      const documentText = await fileData.text();
      const truncatedText = documentText.slice(0, 80000);

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + openaiKey,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a logistics and transportation expert. Analyze tariff documents and provide clear, detailed summaries with SPECIFIC information - actual rates, dates, amounts."
            },
            {
              role: "user",
              content: "Analyze this tariff document and provide a comprehensive summary with SPECIFIC details: 1. Carrier & Service Details 2. Rate Structure (actual rates) 3. Geographic Coverage (specific areas) 4. Effective Dates (exact dates) 5. Key Terms & Conditions 6. Notable Features. Document: " + truncatedText
            }
          ],
          temperature: 0.2,
          max_tokens: 3000,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error('OpenAI API error');
      }

      const aiResult = await openaiResponse.json();
      summary = aiResult.choices[0]?.message?.content || "Unable to generate summary";
    }

    if (summary.includes('corrupted') || summary.includes('improperly formatted') || summary.includes('cannot extract')) {
      throw new Error('PDF appears to be corrupted or unreadable');
    }

    await supabase
      .from("tariffs")
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq("id", tariffId);

    console.log('Summary saved successfully');

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'If the PDF is scanned or image-based, it may not be processable. Try uploading a text-based PDF or Excel file instead.'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});