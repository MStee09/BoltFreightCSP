import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function extractPDFText(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfJsLib = await import("npm:pdfjs-dist@4.0.379");
    
    const loadingTask = pdfJsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 50); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

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
    const { tariffId, question, conversationHistory = [] } = await req.json();

    if (!tariffId || !question) {
      throw new Error("Missing tariffId or question");
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

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError) {
      throw downloadError;
    }

    const fileName = tariff.file_name || tariff.file_url.split('/').pop() || 'document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';

    let documentText = '';

    if (isPDF) {
      const arrayBuffer = await fileData.arrayBuffer();
      documentText = await extractPDFText(arrayBuffer);
    } else {
      documentText = await fileData.text();
    }

    const truncatedText = documentText.slice(0, 80000);

    if (!truncatedText || truncatedText.trim().length < 100) {
      throw new Error("Document appears to be empty or could not be read.");
    }

    const messages = [
      {
        role: "system",
        content: `You are a logistics and transportation expert assistant. You have access to a tariff document and can answer questions about it. Be concise, accurate, and cite specific information from the document when possible.\n\nDocument context:\n${truncatedText}`
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
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResult = await openaiResponse.json();
    const answer = aiResult.choices[0]?.message?.content || "Unable to generate answer";

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