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

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { data: { user } } = await supabase.auth.getUser(token || "");

    const { cspEventId, message, conversationHistory } = await req.json();

    if (!cspEventId || !message) {
      throw new Error("Missing required parameters");
    }

    const { data: event, error: eventError } = await supabase
      .from('csp_events')
      .select('*, strategy_summary')
      .eq('id', cspEventId)
      .single();

    if (eventError) throw eventError;

    const strategySummary = event?.strategy_summary;

    if (!strategySummary) {
      return new Response(
        JSON.stringify({
          response: "No strategy data available yet. Please upload transaction and opportunity data first."
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let aiSettings = null;
    if (user?.id) {
      const { data: settings } = await supabase
        .from('ai_chatbot_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      aiSettings = settings;
    }

    const { data: knowledgeDocs } = await supabase
      .from('knowledge_base_documents')
      .select('title, content')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    let knowledgeBaseContent = '';
    if (knowledgeDocs && knowledgeDocs.length > 0) {
      knowledgeBaseContent = knowledgeDocs.map(doc =>
        `\n### ${doc.title}\n${doc.content}`
      ).join('\n\n');
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      const response = generateIntelligentResponse(message, strategySummary);
      return new Response(
        JSON.stringify({ response }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const defaultInstructions = `You are an expert logistics and carrier strategy analyst helping with CSP (Carrier Service Provider) bid analysis. You provide clear, actionable insights based on shipment data. Be specific with numbers and recommendations. Keep responses concise but informative.`;

    const systemPrompt = aiSettings?.instructions || defaultInstructions;
    const knowledgeBase = aiSettings?.knowledge_base || '';
    const temperature = aiSettings?.temperature || 0.7;
    const maxTokens = aiSettings?.max_tokens || 1000;

    const dataContext = `Here is the shipment data analysis:
- Total Shipments: ${strategySummary.shipment_count?.toLocaleString()}
- Unique Lanes: ${strategySummary.lane_count}
- Total Spend: $${strategySummary.total_spend?.toLocaleString()}
- Missed Savings Opportunities: $${strategySummary.lost_opportunity_total?.toLocaleString()}
- Number of Lost Opportunities: ${strategySummary.lost_opportunity_count}

Top Carriers (by volume):
${strategySummary.carrier_breakdown?.slice(0, 5).map((c: any) =>
  `- ${c.carrier}: ${c.shipments} shipments (${c.percentage}%), $${Math.round(c.spend).toLocaleString()} spend`
).join('\n') || 'No data available'}

Top Lanes (by volume):
${strategySummary.top_lanes?.slice(0, 5).map((l: any) =>
  `- ${l.lane}: ${l.shipments} shipments, $${Math.round(l.spend).toLocaleString()} spend`
).join('\n') || 'No data available'}

Carriers with Missed Savings:
${strategySummary.missed_savings_by_carrier?.slice(0, 5).map((m: any) =>
  `- ${m.carrier}: ${m.opportunities} opportunities, $${Math.round(m.savings).toLocaleString()} potential savings`
).join('\n') || 'No data available'}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: dataContext }
    ];

    if (knowledgeBaseContent && knowledgeBaseContent.trim()) {
      messages.push({
        role: "system",
        content: `**IMPORTANT: Knowledge Base Documents (Primary Source of Truth)**\n\nThe following documents contain company-specific information, policies, and guidelines. When answering questions, ALWAYS prioritize information from these documents over general knowledge.\n\n${knowledgeBaseContent}\n\nRemember: Information in these documents takes precedence over general knowledge.`
      });
    }

    const knowledgeBase = aiSettings?.knowledge_base || '';
    if (knowledgeBase && knowledgeBase.trim()) {
      messages.push({
        role: "system",
        content: `Additional Context from AI Settings:\n${knowledgeBase}`
      });
    }

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    messages.push({ role: "user", content: message });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      const response = generateIntelligentResponse(message, strategySummary);
      return new Response(
        JSON.stringify({ response }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const response = openaiData.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ response }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error in chat-with-strategy:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process chat request'
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

function generateIntelligentResponse(message: string, strategySummary: any): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('carrier') && (lowerMessage.includes('which') || lowerMessage.includes('what') || lowerMessage.includes('recommend'))) {
    const topCarriers = strategySummary.carrier_breakdown?.slice(0, 3) || [];
    const missedSavings = strategySummary.missed_savings_by_carrier || [];

    let response = `Based on the data analysis:\n\n`;

    if (lowerMessage.includes('bid') || lowerMessage.includes('csp') || lowerMessage.includes('sense')) {
      response += `**Carriers to Include in CSP Bid:**\n\n`;
      response += `1. **Current High-Volume Carriers** (for competitive pressure):\n`;
      topCarriers.forEach((c: any, i: number) => {
        response += `   ${i + 1}. ${c.carrier} - ${c.percentage}% of volume ($${Math.round(c.spend).toLocaleString()} spend)\n`;
      });

      if (missedSavings.length > 0) {
        response += `\n2. **Carriers with Savings Opportunities** (renegotiation targets):\n`;
        missedSavings.slice(0, 3).forEach((m: any, i: number) => {
          response += `   ${i + 1}. ${m.carrier} - $${Math.round(m.savings).toLocaleString()} in potential savings across ${m.opportunities} loads\n`;
        });
      }

      response += `\n**Recommendation:** Include your top 3 volume carriers plus 2-3 alternative carriers who could offer better rates. This creates competitive tension while maintaining service continuity.`;
    }

    return response;
  }

  if (lowerMessage.includes('saving') || lowerMessage.includes('save') || lowerMessage.includes('opportunity')) {
    const totalSavings = strategySummary.lost_opportunity_total || 0;
    const missedSavings = strategySummary.missed_savings_by_carrier || [];

    let response = `**Savings Analysis:**\n\n`;
    response += `Total identified savings opportunity: **$${Math.round(totalSavings).toLocaleString()}**\n\n`;

    if (missedSavings.length > 0) {
      response += `Top carriers where you're overpaying:\n`;
      missedSavings.slice(0, 5).forEach((m: any, i: number) => {
        response += `${i + 1}. ${m.carrier} - $${Math.round(m.savings).toLocaleString()} (${m.opportunities} loads)\n`;
      });

      response += `\n**Action Steps:**\n`;
      response += `1. Prioritize renegotiations with ${missedSavings[0]?.carrier} (largest opportunity)\n`;
      response += `2. Use lower-cost alternatives as leverage in negotiations\n`;
      response += `3. Consider shifting volume to carriers offering better rates on these lanes`;
    }

    return response;
  }

  if (lowerMessage.includes('lane') || lowerMessage.includes('route')) {
    const topLanes = strategySummary.top_lanes || [];

    let response = `**Lane Analysis:**\n\n`;
    response += `Top lanes by volume:\n`;
    topLanes.slice(0, 5).forEach((l: any, i: number) => {
      response += `${i + 1}. ${l.lane} - ${l.shipments} shipments, $${Math.round(l.spend).toLocaleString()} spend\n`;
    });

    response += `\n**Insight:** Focus your CSP bid on these high-volume lanes to maximize impact and leverage economies of scale.`;

    return response;
  }

  if (lowerMessage.includes('spend') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    const totalSpend = strategySummary.total_spend || 0;
    const carrierBreakdown = strategySummary.carrier_breakdown || [];

    let response = `**Spend Analysis:**\n\n`;
    response += `Total shipping spend: **$${Math.round(totalSpend).toLocaleString()}**\n\n`;
    response += `Spend concentration:\n`;
    carrierBreakdown.slice(0, 5).forEach((c: any, i: number) => {
      response += `${i + 1}. ${c.carrier} - $${Math.round(c.spend).toLocaleString()} (${c.percentage}%)\n`;
    });

    const top3Percentage = carrierBreakdown.slice(0, 3).reduce((sum: number, c: any) => sum + c.percentage, 0);
    response += `\nYour top 3 carriers represent ${top3Percentage.toFixed(1)}% of total spend. `;
    if (top3Percentage > 70) {
      response += `This high concentration gives you strong negotiating leverage.`;
    } else {
      response += `Consider consolidating volume for better negotiating power.`;
    }

    return response;
  }

  if (lowerMessage.includes('priority') || lowerMessage.includes('urgent') || lowerMessage.includes('first')) {
    const missedSavings = strategySummary.missed_savings_by_carrier || [];
    const totalSavings = strategySummary.lost_opportunity_total || 0;

    let response = `**Priority Actions:**\n\n`;

    if (totalSavings > 50000) {
      response += `⚠️ **High Priority** - You have $${Math.round(totalSavings).toLocaleString()} in identified savings opportunities.\n\n`;
    }

    response += `1. **Immediate:** Renegotiate with ${missedSavings[0]?.carrier} ($${Math.round(missedSavings[0]?.savings || 0).toLocaleString()} opportunity)\n`;
    response += `2. **This Quarter:** Launch CSP bid focusing on top 5 lanes\n`;
    response += `3. **Ongoing:** Implement monthly rate benchmarking\n\n`;
    response += `Expected timeline: 60-90 days for CSP completion, with immediate quick wins possible through spot negotiations.`;

    return response;
  }

  return `I can help you analyze this strategy data. Here are some things you can ask me:

• "Which carriers should I include in my CSP bid?"
• "What are my biggest savings opportunities?"
• "What are my top lanes?"
• "How is my spend distributed?"
• "What should I prioritize?"

**Quick Overview:**
- You're spending $${Math.round(strategySummary.total_spend || 0).toLocaleString()} across ${strategySummary.shipment_count} shipments
- There's $${Math.round(strategySummary.lost_opportunity_total || 0).toLocaleString()} in potential savings
- Your top carrier is ${strategySummary.carrier_breakdown?.[0]?.carrier} with ${strategySummary.carrier_breakdown?.[0]?.percentage}% of volume

What specific aspect would you like to explore?`;
}
