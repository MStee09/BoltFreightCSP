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
      throw new Error("No document attached");
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError) {
      throw downloadError;
    }

    const fileName = tariff.file_name || 'unknown';
    const fileSize = fileData.size;
    const fileType = fileData.type;

    let extractedText = '';
    let extractionMethod = '';

    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(uint8Array);
      
      const textMatches = rawText.match(/[\x20-\x7E\s]{10,}/g);
      if (textMatches && textMatches.length > 0) {
        extractedText = textMatches.join('\n');
        extractionMethod = 'Basic UTF-8 text extraction';
      } else {
        extractedText = 'No readable text found';
        extractionMethod = 'Basic UTF-8 text extraction (failed)';
      }
    } catch (e) {
      extractedText = 'Extraction error: ' + e.message;
      extractionMethod = 'Error';
    }

    const isProbablyScanned = extractedText.length < 500 || extractedText === 'No readable text found';

    const debugInfo = {
      fileName,
      fileSize: fileSize + ' bytes',
      fileType,
      extractionMethod,
      extractedTextLength: extractedText.length,
      isProbablyScanned,
      first1000Chars: extractedText.slice(0, 1000),
      diagnosis: isProbablyScanned 
        ? 'This PDF appears to be a scanned image or has no extractable text. You need OCR (Optical Character Recognition) to process it. Solutions: (1) Use Adobe Acrobat to OCR the PDF, (2) Use an online OCR service like ocr.space or Adobe Export PDF, (3) Upload the document as an Excel or text file instead.'
        : 'Text was successfully extracted from this PDF. If summaries are still generic, the issue is with the AI analysis, not extraction.',
      fullExtractedText: extractedText.slice(0, 10000)
    };

    return new Response(
      JSON.stringify(debugInfo, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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