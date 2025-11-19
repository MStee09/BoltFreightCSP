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

function intelligentTruncate(text: string, maxTokens: number = 20000): string {
  const maxChars = maxTokens * 4;
  
  if (text.length <= maxChars) {
    return text;
  }
  
  const beginning = text.slice(0, Math.floor(maxChars * 0.4));
  const end = text.slice(-Math.floor(maxChars * 0.4));
  const middle = text.slice(
    Math.floor(text.length * 0.45),
    Math.floor(text.length * 0.45) + Math.floor(maxChars * 0.2)
  );
  
  return beginning + "\n\n... [middle section truncated] ...\n\n" + middle + "\n\n... [content truncated] ...\n\n" + end;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Starting summarize-document function...');
    
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

    console.log('File downloaded, size:', fileData?.size || 0, 'bytes');

    if (isPDF) {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('Extracting text from PDF...');
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(uint8Array);
        
        const textMatches = rawText.match(/[\x20-\x7E\s]{10,}/g);
        if (textMatches && textMatches.length > 0) {
          extractedText = textMatches.join('\n');
          console.log('Text extracted, length:', extractedText.length);
        } else {
          console.log('No text matches found in PDF');
        }
      } catch (e) {
        console.error('PDF extraction error:', e);
        throw new Error("PDF extraction failed: " + e.message);
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

    console.log('Extracted text length:', extractedText.length);

    if (!extractedText || extractedText.trim().length < 100) {
      console.log('Insufficient text extracted, returning error summary');
      const errorSummary = 'This document could not be automatically processed. The PDF may be: (1) A scanned image without OCR text layer, (2) Password protected or encrypted, (3) Corrupted. Please try: (1) Converting the PDF to text using Adobe Acrobat or similar tool, (2) Uploading as an Excel or CSV file instead, (3) Using a different version of the document.';
      
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

    const truncatedText = intelligentTruncate(extractedText, 20000);
    const estimatedTokens = estimateTokens(truncatedText);
    console.log('Sending to OpenAI, estimated tokens:', estimatedTokens);

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
            content: "You are a logistics and transportation expert. Analyze tariff documents and provide clear, detailed summaries with SPECIFIC information extracted from the document. Focus on extracting concrete details like carrier names, rates, locations, dates, and terms."
          },
          {
            role: "user",
            content: "Analyze this tariff document and provide a comprehensive summary with SPECIFIC details. Extract and organize the following:\n\n1. **Carrier & Service Details**: Carrier name, service type, mode\n2. **Rate Structure**: Base rates, surcharges, minimums (with actual numbers)\n3. **Geographic Coverage**: Origin/destination locations, service areas\n4. **Effective Dates**: Start date, end date, validity period\n5. **Key Terms**: Payment terms, liability limits, special conditions\n6. **Notable Features**: Unique clauses, exceptions, special services\n\nFor each section, extract SPECIFIC data from the document. If a section is not found, state 'Not specified in document'.\n\nDocument text:\n\n" + truncatedText
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
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

    console.log('Saving summary to database, length:', summary.length);
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
    console.error("Fatal error:", error);
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