import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function extractTextFromPDFWithVision(pdfBase64: string, openaiKey: string): Promise<string> {
  console.log('Extracting text using GPT-4o Vision (multi-page analysis)...');
  
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
              text: "This is a carrier tariff document (may be multiple pages). Extract ALL visible text including:\n\n- Headers, titles, and document information\n- All rate tables with zones, weights, and prices\n- Service descriptions and codes\n- Dates (effective dates, expiration dates)\n- Geographic information (origins, destinations, zones)\n- All surcharges and fees\n- Terms and conditions\n- Contact information\n- Any fine print or footnotes\n\nPreserve the structure and organization. Include ALL numbers exactly as shown. Return the complete extracted text."
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
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('\n=== DOCUMENT SUMMARIZATION START ===');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { tariffId } = await req.json();

    if (!tariffId) {
      throw new Error("Missing tariffId parameter");
    }

    console.log(`Processing tariff: ${tariffId}`);

    const { data: tariff, error: tariffError } = await supabase
      .from("tariffs")
      .select("*")
      .eq("id", tariffId)
      .single();

    if (tariffError || !tariff) {
      throw new Error(`Tariff not found: ${tariffError?.message}`);
    }

    if (!tariff.file_url) {
      throw new Error("No document attached to this tariff");
    }

    console.log(`File: ${tariff.file_name || tariff.file_url}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError || !fileData) {
      throw new Error(`File download failed: ${downloadError?.message}`);
    }

    const fileSize = fileData.size;
    console.log(`Downloaded: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    if (fileSize > 20 * 1024 * 1024) {
      throw new Error("File too large (max 20MB)");
    }

    const fileName = tariff.file_name || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';

    console.log(`File type: ${fileExtension}, isPDF: ${isPDF}`);

    let extractedText = '';

    if (isPDF) {
      console.log('Converting PDF to base64...');
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));
      console.log(`Base64 size: ${(base64.length / 1024 / 1024).toFixed(2)} MB`);
      
      extractedText = await extractTextFromPDFWithVision(base64, openaiKey);
    } else {
      console.log('Reading text file...');
      extractedText = await fileData.text();
      console.log(`Text file length: ${extractedText.length} characters`);
    }

    if (!extractedText || extractedText.trim().length < 100) {
      console.log('ERROR: Insufficient text extracted');
      const errorMsg = '⚠️ **Document Processing Failed**\n\nUnable to extract text from this document. Possible reasons:\n\n1. **Encrypted/Protected PDF** - The file may be password protected\n2. **Corrupted File** - The PDF structure may be damaged\n3. **Unsupported Format** - Try converting to a standard PDF\n\n**Next Steps:**\n- Remove password protection if present\n- Re-save the PDF using Adobe Acrobat or similar\n- Try uploading in Excel/CSV format instead\n- Contact support if this issue persists';
      
      await supabase
        .from("tariffs")
        .update({
          ai_summary: errorMsg,
          ai_summary_generated_at: new Date().toISOString(),
        })
        .eq("id", tariffId);

      return new Response(
        JSON.stringify({ success: true, summary: errorMsg, warning: 'Extraction failed' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully extracted ${extractedText.length} characters`);
    console.log('Generating structured summary...');
    
    const truncatedText = extractedText.slice(0, 120000);
    
    const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a logistics tariff analyst. Create detailed, well-organized summaries of carrier rate documents. Always extract specific numbers, dates, rates, and terms from the document. Be comprehensive and precise."
          },
          {
            role: "user",
            content: `Analyze this carrier tariff document and create a comprehensive summary.

**IMPORTANT:** Extract ALL specific details including exact rates, dates, zones, and fees from the document.

Organize your summary using these sections:

## 📋 Document Information
- Document title/name
- Issuing company
- Document date and version

## 🚚 Carrier & Service Details
- Carrier name and contact information  
- Service types offered (list each with codes/names)
- Transportation mode (Air, Ocean, Ground, etc.)

## 💰 Rate Structure
- **Base Rates:** Include complete rate tables with zones, weight breaks, and prices
- **Minimum Charges:** List all minimums by service type
- **Surcharges:** List ALL surcharges with exact amounts (fuel, residential, oversized, etc.)

## 🗺️ Geographic Coverage
- Origin points/terminals (list all cities/airports)
- Destination zones (describe zone structure)
- Remote area surcharges
- Service area restrictions

## 📅 Contract Terms & Dates
- **Effective Date:** [exact date]
- **Expiration Date:** [exact date]  
- Payment terms and conditions
- Fuel surcharge methodology
- Liability/Declared value limits

## 🎯 Special Services & Additional Fees
- Delivery service levels (threshold, room of choice, white glove, etc.)
- Assembly and installation services
- Weekend/holiday delivery fees
- Storage, returns, and redelivery charges
- Other accessorial services

## ⚠️ Important Terms & Conditions
- Dimensional weight calculation formula
- Package size/weight restrictions
- Claims and liability provisions  
- Notable exclusions or limitations

## 📊 Key Highlights
- Most important takeaways from this tariff
- Unique features or competitive advantages
- Any special notes or warnings

---

**Document text to analyze:**

${truncatedText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('Summary generation error:', summaryResponse.status, errorText);
      throw new Error(`Failed to generate summary: ${errorText}`);
    }

    const summaryResult = await summaryResponse.json();
    const summary = summaryResult.choices[0]?.message?.content || "Unable to generate summary";

    console.log(`Generated summary: ${summary.length} characters`);
    console.log('Saving to database...');

    const { error: updateError } = await supabase
      .from("tariffs")
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq("id", tariffId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('=== SUMMARIZATION COMPLETE ===\n');

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
    console.error('=============\n');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error occurred"
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});