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
      supabase.from('customers').select('*').limit(100),
      supabase.from('carriers').select('*').limit(100),
      supabase.from('csp_events').select('*, customer:customers(*)').limit(100),
      supabase.from('tariffs').select('*, customer:customers(*)').limit(100),
      supabase.from('alerts').select('*').eq('status', 'active').limit(50),
    ]);

    console.log('Data fetched:', {
      customers: customersData.data?.length || 0,
      carriers: carriersData.data?.length || 0,
      cspEvents: cspEventsData.data?.length || 0,
      tariffs: tariffsData.data?.length || 0,
      alerts: alertsData.data?.length || 0
    });

    const customerCount = customersData.data?.length || 0;
    const carrierCount = carriersData.data?.length || 0;
    const activeCSPs = cspEventsData.data?.filter(e => e.status === 'active' || e.status === 'in_progress').length || 0;
    const activeTariffs = tariffsData.data?.filter(t => t.status === 'active').length || 0;
    const activeAlerts = alertsData.data?.length || 0;

    const allCustomers = customersData.data?.map(c =>
      `- ${c.name}: Status=${c.status || 'N/A'}, Segment=${c.segment || 'N/A'}, Owner=${c.account_owner || 'N/A'}, Revenue=${c.revenue_tier || 'N/A'}, Spend=$${(c.total_spend || 0).toLocaleString()}, Lanes=${c.active_lanes || 0}`
    ).join('\n') || 'No customer data available';

    const carriersWithMissingSCAC = carriersData.data?.filter(c => !c.scac || c.scac.trim() === '') || [];
    const carriersWithMissingContact = carriersData.data?.filter(c => !c.contact_email || c.contact_email.trim() === '') || [];

    const allCarriers = carriersData.data?.map(c =>
      `- ${c.name} (SCAC: ${c.scac || '**MISSING**'}): Quality ${c.service_quality_score || 'N/A'}/5, On-time ${c.on_time_percentage || 'N/A'}%, Contact: ${c.contact_email || '**MISSING**'}`
    ).join('\n') || 'No carrier data available';

    let dataQualityIssues = '';
    if (carriersWithMissingSCAC.length > 0) {
      dataQualityIssues += `\n\n**⚠️ DATA QUALITY ALERT - Carriers Missing SCAC Codes:**\n`;
      dataQualityIssues += carriersWithMissingSCAC.map(c => `- ${c.name}`).join('\n');
    }
    if (carriersWithMissingContact.length > 0) {
      dataQualityIssues += `\n\n**⚠️ DATA QUALITY ALERT - Carriers Missing Contact Email:**\n`;
      dataQualityIssues += carriersWithMissingContact.map(c => `- ${c.name}`).join('\n');
    }

    const customersWithMissingInfo = customersData.data?.filter(c => !c.contact_name || !c.contact_email) || [];
    if (customersWithMissingInfo.length > 0) {
      dataQualityIssues += `\n\n**⚠️ DATA QUALITY ALERT - Customers Missing Contact Information:**\n`;
      dataQualityIssues += customersWithMissingInfo.map(c => `- ${c.name} (Missing: ${!c.contact_name ? 'Name' : ''} ${!c.contact_email ? 'Email' : ''})`).join('\n');
    }

    const allCSPs = cspEventsData.data?.map(e =>
      `- "${e.title}" for ${e.customer?.name || 'Unknown Customer'}: Status=${e.status}, Stage=${e.stage || 'N/A'}, Priority=${e.priority || 'N/A'}, Target=$${(e.target_savings || 0).toLocaleString()}, Actual=$${(e.actual_savings || 0).toLocaleString()}, Days in stage=${e.days_in_stage || 0}`
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

    const defaultInstructions = `You are a knowledgeable logistics and procurement assistant helping ${userFirstName} understand their transportation management data. Address them by their first name occasionally to keep the conversation personal and friendly. Provide clear, data-driven insights. Be conversational but professional. When asked about specific data, reference the actual numbers provided in the context.\n\nIMPORTANT: When the user asks about data quality or what they should focus on, actively look for issues in the data:\n- Missing contact information (email, phone, names)\n- Incomplete carrier information (missing SCAC codes)\n- Customers without segments or spend data\n- Tariffs without proper dates or rates\n\nIf you notice data quality issues in the message context, proactively point them out and tell the user exactly where to fix them (e.g., "Go to the Customers page and fill in contact emails for 3 customers" or "Visit the Carriers page - 2 carriers are missing SCAC codes").`;

    const systemPrompt = aiSettings?.instructions || defaultInstructions;
    const knowledgeBase = aiSettings?.knowledge_base || '';
    const temperature = aiSettings?.temperature || 0.7;
    const maxTokens = aiSettings?.max_tokens || 1000;

    const dataContext = `You have access to the following COMPLETE application data:\n\n**Overview Statistics:**\n- Total Customers: ${customerCount}\n- Total Carriers: ${carrierCount}\n- Active CSP Events: ${activeCSPs}\n- Active Tariffs: ${activeTariffs}\n- Active Alerts: ${activeAlerts}\n\n**ALL CUSTOMERS (Complete List):**\n${allCustomers}\n\n**ALL CARRIERS (Complete List):**\n${allCarriers}\n${dataQualityIssues}\n\n**ALL CSP EVENTS (Complete List):**\n${allCSPs}\n\n**Tariffs Expiring Soon (next 60 days):**\n${expiringTariffs}\n\n**Active Alerts:**\n${alertsSummary}\n\nIMPORTANT: You have the COMPLETE list of all customers and CSP events above. When asked about a specific customer or CSP event, search through the COMPLETE lists above. For example, if asked about "Torque Fitness LLC", you should find it in the customers list and any related CSP events in the CSP events list. Do NOT say you don't have information about customers that are clearly listed above.\n\nCRITICAL: When you identify data quality issues (like carriers with **MISSING** SCAC codes or customers with missing contact info), ALWAYS list the SPECIFIC entity names. Never say "check all carriers" - instead say "These carriers need SCAC codes: [list specific carrier names]". Be specific and actionable.`;

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