import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CloudConvertJob {
  id: string;
  status: string;
  tasks?: Array<{
    id: string;
    operation: string;
    status: string;
    result?: {
      files?: Array<{
        filename: string;
        url: string;
      }>;
    };
  }>;
}

async function convertPDFToImages(pdfBuffer: ArrayBuffer): Promise<string[]> {
  const cloudConvertKey = Deno.env.get("CLOUDCONVERT_API_KEY");
  
  if (!cloudConvertKey) {
    console.log('CloudConvert not available, using direct GPT-4o approach');
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    return [base64];
  }

  console.log('Using CloudConvert to convert PDF to images...');
  
  try {
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'document.pdf');
    
    const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-pdf': {
            operation: 'import/upload'
          },
          'convert-to-png': {
            operation: 'convert',
            input: 'import-pdf',
            output_format: 'png',
            pages: '1-6',
            pixel_density: 150
          },
          'export-images': {
            operation: 'export/url',
            input: 'convert-to-png'
          }
        }
      })
    });

    if (!jobResponse.ok) {
      throw new Error('CloudConvert job creation failed');
    }

    const job: CloudConvertJob = await jobResponse.json();
    const uploadTask = job.tasks?.find(t => t.operation === 'import/upload');
    
    if (!uploadTask?.result?.files?.[0]?.url) {
      throw new Error('No upload URL received');
    }

    await fetch(uploadTask.result.files[0].url, {
      method: 'POST',
      body: new Blob([pdfBuffer]),
      headers: { 'Content-Type': 'application/pdf' }
    });

    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.id}`, {
        headers: { 'Authorization': `Bearer ${cloudConvertKey}` }
      });
      
      const statusJob: CloudConvertJob = await statusResponse.json();
      
      if (statusJob.status === 'finished') {
        const exportTask = statusJob.tasks?.find(t => t.operation === 'export/url');
        const imageUrls = exportTask?.result?.files?.map(f => f.url) || [];
        
        const base64Images: string[] = [];
        for (const url of imageUrls.slice(0, 6)) {
          const imgResponse = await fetch(url);
          const imgBuffer = await imgResponse.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
          base64Images.push(base64);
        }
        
        return base64Images;
      }
      
      if (statusJob.status === 'error') {
        throw new Error('CloudConvert conversion failed');
      }
      
      attempts++;
    }
    
    throw new Error('Conversion timeout');
  } catch (error) {
    console.error('CloudConvert error:', error);
    console.log('Falling back to direct PDF approach');
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    return [base64];
  }
}

async function extractTextWithGPT4o(base64Image: string, openaiKey: string, format: 'png' | 'pdf' = 'png', pageNum: number = 1): Promise<string> {
  console.log(`Extracting text from page ${pageNum} using GPT-4o...`);
  
  const mimeType = format === 'png' ? 'image/png' : 'application/pdf';
  
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
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract ALL visible text from this document page (page ${pageNum}). Include:\n- All text content\n- Numbers, rates, and values\n- Table data with structure\n- Headers and footers\n\nReturn ONLY the raw extracted text. Do not add analysis or commentary.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GPT-4o extraction error (page ${pageNum}):`, response.status, errorText);
    throw new Error(`GPT-4o failed on page ${pageNum}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.choices[0]?.message?.content || '';
  console.log(`Extracted ${text.length} characters from page ${pageNum}`);
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('\n=== SUMMARIZE DOCUMENT START ===');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { tariffId } = await req.json();

    if (!tariffId) {
      throw new Error("Missing tariffId");
    }

    console.log(`Processing tariff ID: ${tariffId}`);

    const { data: tariff, error: tariffError } = await supabase
      .from("tariffs")
      .select("*")
      .eq("id", tariffId)
      .single();

    if (tariffError || !tariff) {
      throw new Error("Tariff not found");
    }

    if (!tariff.file_url) {
      throw new Error("No document attached");
    }

    console.log(`File: ${tariff.file_name || tariff.file_url}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError || !fileData) {
      throw new Error("Failed to download file");
    }

    const fileSize = fileData.size;
    console.log(`Downloaded ${fileSize} bytes`);

    if (fileSize > 25 * 1024 * 1024) {
      throw new Error("File too large (max 25MB)");
    }

    const arrayBuffer = await fileData.arrayBuffer();
    
    console.log('Converting PDF to images...');
    const base64Images = await convertPDFToImages(arrayBuffer);
    console.log(`Got ${base64Images.length} images to process`);
    
    let allExtractedText = '';
    
    const imagesToProcess = base64Images.slice(0, 6);
    console.log(`Processing ${imagesToProcess.length} pages...`);
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      try {
        const format = base64Images.length === 1 ? 'pdf' : 'png';
        const pageText = await extractTextWithGPT4o(imagesToProcess[i], openaiKey, format, i + 1);
        allExtractedText += `\n\n=== PAGE ${i + 1} ===\n\n${pageText}`;
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
      }
    }

    console.log(`Total extracted text: ${allExtractedText.length} characters`);

    if (allExtractedText.length < 200) {
      const errorMsg = '⚠️ **Unable to extract text from document**\n\nThe document could not be read. This may be because:\n- The PDF is encrypted or password-protected\n- The file is corrupted\n- The document format is not supported\n\nPlease try uploading a different version of the document.';
      
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

    console.log('Generating summary with GPT-4o-mini...');
    
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
            content: "You are a logistics expert analyzing carrier tariff documents. Extract specific rates, dates, zones, fees, and terms. Always include actual numbers and details from the document."
          },
          {
            role: "user",
            content: `Create a detailed summary of this carrier tariff document. Organize by:

## 1. Carrier & Service Details
- Carrier name and issuer
- Service types (with codes)
- Transportation mode

## 2. Rate Structure
- Base rates by zone/weight (include actual rate tables)
- Minimum charges
- All surcharges with amounts

## 3. Geographic Coverage
- Origin terminals/cities
- Destination zones
- Remote area fees

## 4. Contract Terms
- Effective date → Termination date
- Payment terms
- Fuel surcharge method
- Liability/declared value

## 5. Special Services & Fees
- Delivery options (threshold, white glove, etc.)
- Weekend/holiday fees
- Accessorial charges

## 6. Key Terms
- Dimensional weight formula
- Important restrictions
- Notable clauses

Extract ALL specific numbers, dates, and rates from the document.

Document text:

${allExtractedText.slice(0, 100000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3500,
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      throw new Error(`Summary generation failed: ${errorText}`);
    }

    const summaryResult = await summaryResponse.json();
    const summary = summaryResult.choices[0]?.message?.content || "Unable to generate summary";

    console.log(`Generated summary: ${summary.length} characters`);

    await supabase
      .from("tariffs")
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq("id", tariffId);

    console.log('=== SUMMARIZE DOCUMENT COMPLETE ===\n');

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ERROR:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});