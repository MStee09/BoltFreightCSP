import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function extractTextFromPDFWithVision(pdfBase64: string, openaiKey: string): Promise<string> {
  console.log('Extracting text using GPT-4o Vision...');
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a precise OCR system. Extract ALL text from documents including tables, rates, numbers, and formatting. Be thorough and accurate."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL visible text from this carrier tariff document. Include:\n\n- All rate tables with zones, weights, and prices\n- Service descriptions and codes\n- Dates (effective dates, expiration dates)\n- Geographic information\n- All surcharges and fees\n- Terms and conditions\n- Any fine print\n\nPreserve structure and include ALL numbers exactly as shown."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 16000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Vision API error:', response.status, errorText);
    throw new Error(`Vision extraction failed: ${errorText}`);
  }

  const result = await response.json();
  const extractedText = result.choices[0]?.message?.content || '';
  console.log(`Extracted ${extractedText.length} characters from PDF`);
  return extractedText;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== CHAT WITH DOCUMENT REQUEST ===');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { tariffId, question, conversationHistory = [] } = await req.json();

    if (!tariffId || !question) {
      throw new Error("Missing tariffId or question");
    }

    console.log(`Tariff: ${tariffId}`);
    console.log(`Question: ${question}`);

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

    console.log(`Downloading file: ${tariff.file_url}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError || !fileData) {
      throw new Error(`File download failed: ${downloadError?.message}`);
    }

    const fileName = tariff.file_name || tariff.file_url.split('/').pop() || 'document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';

    console.log(`File type: ${fileExtension}, isPDF: ${isPDF}`);

    let documentText = '';

    if (isPDF) {
      console.log('Converting PDF to base64...');
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));
      console.log(`Base64 size: ${(base64.length / 1024 / 1024).toFixed(2)} MB`);
      
      documentText = await extractTextFromPDFWithVision(base64, openaiKey);
    } else {
      console.log('Reading text file...');
      documentText = await fileData.text();
    }

    if (!documentText || documentText.trim().length < 100) {
      throw new Error("Document appears to be empty or could not be read.");
    }

    console.log(`Document text length: ${documentText.length} characters`);

    const truncatedText = documentText.slice(0, 100000);

    console.log('Generating answer with GPT-4o-mini...');

    const messages = [
      {
        role: "system",
        content: `You are a logistics and transportation tariff expert. You have access to a carrier tariff document and can answer specific questions about it.

IMPORTANT INSTRUCTIONS:
- Answer based ONLY on the information in the document provided
- Be specific and cite exact rates, fees, zones, or terms when available
- If the document doesn't contain the requested information, say so clearly
- For rate/pricing questions, provide the exact numbers from the document
- For geographic questions, list the specific zones or locations mentioned
- Keep answers concise but complete

DOCUMENT TEXT:
${truncatedText}`
      },
      ...conversationHistory,
      {
        role: "user",
        content: question
      }
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResult = await openaiResponse.json();
    const answer = aiResult.choices[0]?.message?.content || "Unable to generate answer";

    console.log('Answer generated successfully');
    console.log('=== CHAT REQUEST COMPLETE ===\n');

    return new Response(
      JSON.stringify({ success: true, answer }),
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
      JSON.stringify({ success: false, error: error.message }),
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