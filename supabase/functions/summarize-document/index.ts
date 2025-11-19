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

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(tariff.file_url);

    if (downloadError) {
      throw downloadError;
    }

    const fileText = await fileData.text();
    const truncatedText = fileText.slice(0, 50000);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a logistics and transportation expert. Analyze tariff documents and provide clear, actionable summaries."
          },
          {
            role: "user",
            content: `Analyze this tariff document and provide a comprehensive summary covering:\n\n1. **Carrier & Service Details**: Carrier name, service type, modes covered\n2. **Rate Structure**: Key rate information, pricing tiers, fuel surcharges\n3. **Geographic Coverage**: Lanes, origin/destination zones\n4. **Effective Dates**: Start and end dates, renewal terms\n5. **Key Terms & Conditions**: Payment terms, liability limits, special provisions\n6. **Notable Features**: Volume commitments, incentives, restrictions\n\nDocument content:\n${truncatedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResult = await openaiResponse.json();
    const summary = aiResult.choices[0]?.message?.content || "Unable to generate summary";

    await supabase
      .from("tariffs")
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq("id", tariffId);

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