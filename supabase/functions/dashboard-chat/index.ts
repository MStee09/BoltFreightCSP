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

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { message, conversationHistory, userName } = await req.json();

    if (!message) {
      throw new Error("Missing message parameter");
    }

    const userFirstName = userName || user.email?.split('@')[0] || 'there';

    let aiSettings = null;
    const { data: settings } = await supabase
      .from('ai_chatbot_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    aiSettings = settings;

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
      return new Response(
        JSON.stringify({
          response: "AI service is not configured. Please contact your administrator."
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const [customersData, carriersData, cspEventsData, tariffsData, alertsData] = await Promise.all([
      supabase.from('customers').select('id, name, segment, total_spend, active_lanes').limit(50),
      supabase.from('carriers').select('id, name, scac, service_quality_score, on_time_percentage').limit(50),
      supabase.from('csp_events').select('id, title, status, stage, target_savings, actual_savings, customer:customers(id, name)').limit(50),
      supabase.from('tariffs').select('id, carrier_name, customer_name, rate, effective_date, expiration_date, status, customer:customers(id, name)').limit(50),
      supabase.from('alerts').select('id, type, priority, title, entity_type').eq('status', 'active').limit(50),
    ]);

    const customerCount = customersData.data?.length || 0;
    const carrierCount = carriersData.data?.length || 0;
    const activeCSPs = cspEventsData.data?.filter(e => e.status === 'active' || e.status === 'in_progress').length || 0;
    const activeTariffs = tariffsData.data?.filter(t => t.status === 'active').length || 0;
    const activeAlerts = alertsData.data?.length || 0;

    const topCustomers = customersData.data?.slice(0, 10).map(c =>
      `- ${c.name}: ${c.segment || 'N/A'} segment, $${(c.total_spend || 0).toLocaleString()} spend, ${c.active_lanes || 0} lanes`
    ).join('\n') || 'No customer data available';

    const topCarriers = carriersData.data?.slice(0, 10).map(c =>
      `- ${c.name} (${c.scac || 'N/A'}): Quality ${c.service_quality_score || 'N/A'}/5, ${c.on_time_percentage || 'N/A'}% on-time`
    ).join('\n') || 'No carrier data available';

    const recentCSPs = cspEventsData.data?.slice(0, 10).map(e =>
      `- "${e.title}" for ${e.customer?.name || 'Unknown'}: ${e.status} (${e.stage || 'N/A'}), Target: $${(e.target_savings || 0).toLocaleString()}, Actual: $${(e.actual_savings || 0).toLocaleString()}`
    ).join('\n') || 'No CSP data available';

    const expiringTariffs = tariffsData.data?.filter(t => {
      if (!t.expiration_date) return false;
      const daysUntilExpiry = Math.floor((new Date(t.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 60 && daysUntilExpiry >= 0;
    }).map(t =>
      `- ${t.carrier_name} / ${t.customer_name}: Expires ${new Date(t.expiration_date).toLocaleDateString()}`
    ).join('\n') || 'No tariffs expiring soon';

    const alertsSummary = alertsData.data?.slice(0, 5).map(a =>
      `- [${a.priority}] ${a.title} (${a.entity_type})`
    ).join('\n') || 'No active alerts';

    const defaultInstructions = `You are a knowledgeable logistics and procurement assistant helping ${userFirstName} understand their transportation management data. Address them by their first name occasionally to keep the conversation personal and friendly. Provide clear, data-driven insights. Be conversational but professional. When asked about specific data, reference the actual numbers provided in the context.

IMPORTANT: When the user asks about data quality or what they should focus on, actively look for issues in the data:
- Missing contact information (email, phone, names)
- Incomplete carrier information (missing SCAC codes)
- Customers without segments or spend data
- Tariffs without proper dates or rates

If you notice data quality issues in the message context, proactively point them out and tell the user exactly where to fix them (e.g., "Go to the Customers page and fill in contact emails for 3 customers" or "Visit the Carriers page - 2 carriers are missing SCAC codes").`;

    const systemPrompt = aiSettings?.instructions || defaultInstructions;
    const knowledgeBase = aiSettings?.knowledge_base || '';
    const temperature = aiSettings?.temperature || 0.7;
    const maxTokens = aiSettings?.max_tokens || 1000;

    const dataContext = `You have access to the following application data:

**Overview Statistics:**
- Total Customers: ${customerCount}
- Total Carriers: ${carrierCount}
- Active CSP Events: ${activeCSPs}
- Active Tariffs: ${activeTariffs}
- Active Alerts: ${activeAlerts}

**Top Customers:**
${topCustomers}

**Top Carriers:**
${topCarriers}

**Recent CSP Events:**
${recentCSPs}

**Tariffs Expiring Soon (next 60 days):**
${expiringTariffs}

**Active Alerts:**
${alertsSummary}

Use this data to answer questions about customers, carriers, CSP events, tariffs, and alerts. If asked about specific details not in this context, let the user know you can see high-level data but they may need to navigate to the specific page for more details.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: dataContext }
    ];

    if (knowledgeBaseContent && knowledgeBaseContent.trim()) {
      messages.push({
        role: "system",
        content: `**IMPORTANT: Knowledge Base Documents (Primary Source of Truth)**\n\nThe following documents contain company-specific information, policies, and guidelines. When answering questions, ALWAYS prioritize information from these documents over general knowledge. If a question relates to content in these documents, cite the document by name and use that information as your primary source.\n\n${knowledgeBaseContent}\n\nRemember: Information in these documents takes precedence over general knowledge.`
      });
    }

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
      throw new Error('Failed to get AI response');
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
    console.error('Error in dashboard-chat:', error);
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