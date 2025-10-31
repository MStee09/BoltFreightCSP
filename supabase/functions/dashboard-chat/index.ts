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

    const appUsageGuide = `
# FreightOps Complete Usage Guide

## Core Purpose
FreightOps is a CSP (Carrier Service Procurement) management system designed to manage the entire lifecycle: identifying opportunities, creating CSP events, inviting carriers, collecting bids, awarding contracts, publishing tariffs, and tracking renewals.

## The Golden Workflow Sequence

### 1. Identify the Opportunity
- Navigate to Customers page
- Search for the customer or create a new one (Name, Ownership, Assigned Owner, Contact Info)
- Review their Tariffs tab to check for expiring tariffs or improvement opportunities
- Goal: Identify which customer's lanes need bidding

### 2. Create a New CSP Event
- Go to Pipeline → Click "+ New CSP Event"
- Fill in: Name (e.g., "2025 Contract Renewal – LTL"), Customer, Priority, Assigned Owner
- Select Service Type (LTL or Home Delivery LTL) and Ownership (Rocket CSP or Customer Direct)
- Add context in Description/Notes explaining the rebid reason
- Goal: Create a centralized workspace for the entire CSP process

### 3. Upload Data for Strategy
- Inside the CSP Event → Navigate to Documents/Data Room section
- Upload: Shipment/lane data files (Excel, CSV), Historical rate performance, Accessorial notes
- Add summary notes (e.g., "2024 historical volume with 3-month lane averages")
- Goal: Have a ready-to-go bid package for carriers

### 4. Choose Carriers and Send Invitations
- In the CSP Event → Click "Invite Carriers" or "Manage Carriers"
- Select carriers from your list
- Add SOP documents or bid rules
- Use standardized subject lines: "Rocketshipping | Invitation to Participate – [Customer Name] CSP Bid"
- Goal: All invited carriers are logged and tracked within the CSP Event

### 5. Manage Email Communication
- Compose emails directly in the CSP Event (not in Outlook)
- System automatically saves all emails to Activity Timeline
- Use standardized subject lines for consistency
- Goal: Never lose track of email conversations

### 6. Collect Carrier Submissions (QA Stage)
- Upload carrier rate sheets to the CSP Event
- Record validation notes (missing lanes, incorrect FSC, etc.)
- Log submission results in event timeline
- Move the CSP card to "Carrier Submissions / QA Round" → "Round 2 / Optimization"
- Goal: All bids stored, validated, and ready for analysis

### 7. Optimize and Select Winners
- Review all bids (manually or via export)
- Document analysis in Activity Timeline
- Select winning carriers per region, lane, or mode
- Move CSP card to "Award & Tariff Finalization"
- System prompts you to create a Proposed Tariff Version
- Goal: Lock in winning carriers and generate proposed tariff

### 8. Award the Tariff
- Go to Tariffs → Rocket CSP
- Review the Proposed Tariff Version
- Upload: Awarded rate table, Finalized carrier list, Effective/expiry dates
- Mark as "Finalized / Published → Active"
- System automatically closes CSP Event and creates audit entries
- Goal: Tariff is now active and linked to Customer and Carrier

### 9. Upload Supporting SOPs
- Open the Tariff → SOP tab
- Add SOP Notes (internal guidance or special handling rules)
- Upload SOP Documents (carrier procedures, weekend delivery guides, PDFs)
- Tag as "Internal" (team only) or "Shared" (carrier viewable)
- Version control is automatic
- Goal: Complete operational documentation

### 10. Implementation & Validation
- Verify billing accuracy with carriers/customers
- Confirm rates loaded correctly in TMS
- Log validation completion in Activity Timeline
- Move CSP Event to "Validation & Monitoring" stage
- Goal: Confirm tariff works in practice

### 11. Renewal Watch and Alerts
- System alerts when tariffs are expiring < 90 days
- Check Dashboard → Alerts or Calendar View
- Monitor for Stale CSP Events (30+ days idle)
- Review Task Due notifications
- Goal: Never miss an expiry or renewal window

### 12. Continuous Improvement
- Review performance metrics (on-time awards, savings, response rates)
- Update SOPs based on lessons learned
- Document insights in Activity Timeline
- Goal: Each cycle gets faster and more effective

## Key Features & How to Use Them

### Pipeline Board
- Visual Kanban board for managing all active CSPs
- Drag-and-drop cards between stages
- Filter by assignee, customer, mode, or show only stale events
- Click any card to view detailed information

### Tariffs Tab
- View all live or expiring contracts
- Organized by ownership type (Rocket CSP vs Customer Direct) and family
- Documents tab shows uploaded tariff files
- SOPs tab contains operational procedures

### Customers Page
- Complete customer relationship management
- View all interactions, tariffs, and documents per customer
- Track customer segments, revenue tiers, and active lanes
- Access CSP Strategy tab for upcoming opportunities

### Carriers Page
- Manage carrier relationships and performance metrics
- Track SCAC codes, service quality scores, on-time percentages
- View all tariffs and interactions per carrier
- Manage carrier contacts

### Activity Timelines
- Every entity (Customer, Carrier, Tariff, CSP Event) has an activity timeline
- Automatic logging of all emails, notes, and status changes
- Full audit trail for compliance and review

### Alerts & Calendar
- Smart reminders for expirations, reviews, and overdue tasks
- Calendar view shows all important dates
- Dashboard displays high-priority alerts

### Reports
- CSP Effectiveness Reports: bid success rates, savings achieved
- User Performance Reports: productivity metrics, awards completed
- Analyze carrier response times and quality

## Power User Habits

1. **Start every project in Pipeline**: Keeps process structured
2. **Keep communication inside CSP Events**: Ensures transparency and traceability
3. **Move cards weekly**: Prevents stale events
4. **Log everything in Activity Timeline**: Your future self will thank you
5. **Check 'Expiring < 90d' every Monday**: Stay ahead of renewals
6. **Update SOPs quarterly**: Ensures operational accuracy
7. **Always finalize tariffs via Award Stage**: Keeps audit trail complete

## Navigation Tips

- **Dashboard**: Your command center with metrics, alerts, and tasks
- **Pipeline**: Kanban board for active CSP events
- **Customers**: Relationship management and tariff history
- **Carriers**: Carrier performance and contact management
- **Tariffs**: All active contracts with documents and SOPs
- **Calendar**: Timeline view of all important dates
- **Reports**: Analytics and performance metrics
- **Settings**: Configure email, AI chatbot, user profile, and system preferences

## Common Questions Answered

**Q: How do I start a new CSP bid?**
A: Pipeline → + New CSP Event → Fill in details → Upload data → Invite carriers

**Q: Where do I find expiring tariffs?**
A: Dashboard shows "Expiring < 90 Days" or go to Tariffs and filter by expiration date

**Q: How do I send emails to carriers?**
A: Open the CSP Event → Click email compose → Recipients are automatically tracked

**Q: Where are documents stored?**
A: Each CSP Event and Tariff has a Documents tab for file uploads

**Q: How do I track what happened?**
A: Check the Activity Timeline on any Customer, Carrier, Tariff, or CSP Event detail page

**Q: What if I need help?**
A: Click Help in the sidebar for the complete guide, or ask me (the AI chatbot) anything!
`;

    const defaultInstructions = `You are a knowledgeable logistics and procurement assistant helping ${userFirstName} understand their transportation management data and learn how to use FreightOps effectively. Address them by their first name occasionally to keep the conversation personal and friendly. Provide clear, data-driven insights. Be conversational but professional.

When asked about specific data, reference the actual numbers provided in the context. When asked about how to use the app or what to do next, reference the comprehensive usage guide provided.

IMPORTANT: When users ask "how do I...", "where can I...", "what should I...", or "help with..." questions, provide step-by-step guidance from the usage guide. Be specific about which page to visit, which buttons to click, and what fields to fill in.

When the user asks about data quality or what they should focus on, actively look for issues in the data:
- Missing contact information (email, phone, names)
- Incomplete carrier information (missing SCAC codes)
- Customers without segments or spend data
- Tariffs without proper dates or rates

If you notice data quality issues, proactively point them out and tell the user exactly where to fix them (e.g., "Go to the Customers page and fill in contact emails for 3 customers" or "Visit the Carriers page - 2 carriers are missing SCAC codes").

You have complete knowledge of how FreightOps works. Help users navigate the system, understand best practices, and follow the Golden Workflow Sequence for maximum efficiency.`;

    const systemPrompt = aiSettings?.instructions || defaultInstructions;
    const knowledgeBase = aiSettings?.knowledge_base || '';
    const temperature = aiSettings?.temperature || 0.7;
    const maxTokens = aiSettings?.max_tokens || 1000;

    const dataContext = `You have access to the following COMPLETE application data:\n\n**Overview Statistics:**\n- Total Customers: ${customerCount}\n- Total Carriers: ${carrierCount}\n- Active CSP Events: ${activeCSPs}\n- Active Tariffs: ${activeTariffs}\n- Active Alerts: ${activeAlerts}\n\n**ALL CUSTOMERS (Complete List):**\n${allCustomers}\n\n**ALL CARRIERS (Complete List):**\n${allCarriers}\n${dataQualityIssues}\n\n**ALL CSP EVENTS (Complete List):**\n${allCSPs}\n\n**Tariffs Expiring Soon (next 60 days):**\n${expiringTariffs}\n\n**Active Alerts:**\n${alertsSummary}\n\nIMPORTANT: You have the COMPLETE list of all customers and CSP events above. When asked about a specific customer or CSP event, search through the COMPLETE lists above. For example, if asked about "Torque Fitness LLC", you should find it in the customers list and any related CSP events in the CSP events list. Do NOT say you don't have information about customers that are clearly listed above.\n\nCRITICAL: When you identify data quality issues (like carriers with **MISSING** SCAC codes or customers with missing contact info), ALWAYS list the SPECIFIC entity names. Never say "check all carriers" - instead say "These carriers need SCAC codes: [list specific carrier names]". Be specific and actionable.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: appUsageGuide },
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