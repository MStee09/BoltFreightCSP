import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function intelligentTruncate(text: string, maxTokens: number = 25000): string {
  const maxChars = maxTokens * 4;
  
  if (text.length <= maxChars) {
    return text;
  }
  
  return text.slice(0, maxChars);
}

async function sendToGPT4Vision(base64Pdf: string, openaiKey: string, pageNum: number = 1): Promise<string> {
  console.log(`Sending page ${pageNum} to GPT-4o for OCR...`);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              text: "Extract ALL text from this document page. Return ONLY the raw text content, preserving structure, tables, and formatting. Do not add any commentary or analysis."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GPT-4o OCR error:', response.status, errorText);
    throw new Error("GPT-4o OCR failed: " + errorText);
  }

  const result = await response.json();
  const extractedText = result.choices[0]?.message?.content || '';
  console.log(`Extracted ${extractedText.length} characters from page ${pageNum}`);
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
    console.log('=== Starting summarize-document function ===');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }
    
    if (!openaiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON body: " + e.message);
    }
    
    const { tariffId } = body;
    console.log('Processing tariffId:', tariffId);

    if (!tariffId) {
      throw new Error("Missing tariffId");
    }

    console.log('Fetching tariff from database...');
    const { data: tariff, error: tariffError } = await supabase
      .from("tariffs")
      .select("*")
      .eq("id", tariffId)
      .single();

    if (tariffError) {
      console.error('Database error:', tariffError);
      throw new Error("Database error: " + tariffError.message);
    }
    
    if (!tariff) {
      throw new Error("Tariff not found");
    }

    console.log('Tariff found:', tariff.file_name);

    if (!tariff.file_url) {
      throw new Error("No document attached to this tariff");
    }

    const fileName = tariff.file_name || tariff.file_url.split('/').pop() || 'document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';

    console.log('File info:', { fileName, fileExtension, isPDF });

    let extractedText = '';

    console.log('Downloading file from storage...');
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error("Failed to download file: " + downloadError.message);
    }

    const fileSize = fileData?.size || 0;
    console.log('File downloaded, size:', fileSize, 'bytes');

    if (fileSize > 20 * 1024 * 1024) {
      throw new Error("File too large (max 20MB)");
    }

    if (isPDF) {
      console.log('Converting PDF to base64...');
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));
      console.log('Base64 length:', base64.length);
      
      try {
        extractedText = await sendToGPT4Vision(base64, openaiKey);
      } catch (visionError) {
        console.error('Vision API failed:', visionError);
        throw new Error("Failed to extract text from PDF: " + visionError.message);
      }
    } else {
      try {
        extractedText = await fileData.text();
        console.log('Text file extracted, length:', extractedText.length);
      } catch (e) {
        console.error('Text extraction error:', e);
        throw new Error("Text extraction failed: " + e.message);
      }
    }

    console.log('Total extracted text length:', extractedText.length);

    if (!extractedText || extractedText.trim().length < 100) {
      console.log('Insufficient text extracted');
      const errorSummary = '⚠️ **Document Processing Failed**\n\nThis document could not be automatically processed. Possible reasons:\n\n1. **Scanned Image**: The PDF is a scanned image without a text layer\n2. **Encrypted/Protected**: The file is password protected\n3. **Corrupted File**: The PDF structure is damaged\n\n**Recommended Actions:**\n- Re-scan the document with OCR enabled\n- Use Adobe Acrobat to add a text layer\n- Try uploading the document in a different format (Excel, CSV, DOCX)\n- Contact support if this issue persists';
      
      await supabase
        .from("tariffs")
        .update({
          ai_summary: errorSummary,
          ai_summary_generated_at: new Date().toISOString(),
        })
        .eq("id", tariffId);

      return new Response(
        JSON.stringify({ success: true, summary: errorSummary, warning: 'Document could not be parsed' }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const truncatedText = intelligentTruncate(extractedText, 25000);
    const estimatedTokens = estimateTokens(truncatedText);
    console.log('Sending to GPT-4o-mini for analysis, estimated tokens:', estimatedTokens);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + openaiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert logistics analyst specializing in carrier tariff documents. Extract and organize specific information from tariff documents into a clear, structured summary. Always include actual numbers, dates, locations, and rates found in the document."
          },
          {
            role: "user",
            content: `Analyze this carrier tariff document and create a comprehensive summary with ALL SPECIFIC DETAILS extracted from the text.

Organize your analysis into these sections:

## 1. Carrier & Service Information
- Carrier name and contact details
- Service types offered (with codes/names)
- Transportation mode(s)

## 2. Rate Structure
- Base rates by zone/weight (include actual numbers from tables)
- Minimum charges
- Surcharges and accessorial fees (with amounts)

## 3. Geographic Coverage  
- Origin locations/terminals
- Destination zones
- Service area definitions
- Remote area fees

## 4. Contract Terms
- Effective date and termination date
- Payment terms and conditions
- Fuel surcharge methodology
- Declared value/liability limits

## 5. Special Services & Fees
- White glove/threshold delivery options
- Assembly services
- Weekend/holiday delivery fees
- Storage, returns, and other accessorial charges

## 6. Important Notes
- Dimensional weight calculations
- Unique clauses or restrictions
- Notable exceptions

Extract EXACT values, dates, and amounts from the document. If specific information is not found, state "Not specified in document".

Document text:

${truncatedText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      throw new Error("OpenAI API error (" + openaiResponse.status + "): " + errorText);
    }

    console.log('OpenAI response received');
    const aiResult = await openaiResponse.json();
    const summary = aiResult.choices[0]?.message?.content || "Unable to generate summary";

    console.log('Summary generated, length:', summary.length);
    console.log('Saving to database...');
    
    const { error: updateError } = await supabase
      .from("tariffs")
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq("id", tariffId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error("Failed to save summary: " + updateError.message);
    }

    console.log('=== Summary saved successfully ===');

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
    console.error("=== FATAL ERROR ===", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error occurred"
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});