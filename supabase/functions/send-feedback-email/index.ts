import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackEmailRequest {
  feedbackType: string;
  title: string;
  description: string;
  currentPage: string;
  priority: string;
  userName: string;
  userEmail: string;
  boltPromptSuggestion: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      feedbackType,
      title,
      description,
      currentPage,
      priority,
      userName,
      userEmail,
      boltPromptSuggestion
    }: FeedbackEmailRequest = await req.json();

    const emailUsername = Deno.env.get('EMAIL_USERNAME');
    const emailPassword = Deno.env.get('EMAIL_PASSWORD');
    const emailFrom = Deno.env.get('EMAIL_FROM');

    if (!emailUsername || !emailPassword || !emailFrom) {
      throw new Error('Email configuration is missing');
    }

    const feedbackTypeLabel = {
      'bug': '🐛 Bug Report',
      'feature_request': '✨ Feature Request',
      'improvement': '🚀 Improvement Suggestion',
      'question': '❓ Question',
      'other': '💬 Other Feedback'
    }[feedbackType] || feedbackType;

    const priorityEmoji = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    }[priority] || '⚪';

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
    }
    .section {
      background: white;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .label {
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 5px;
    }
    .value {
      color: #1f2937;
      margin-bottom: 15px;
    }
    .bolt-prompt {
      background: #f0fdf4;
      border: 2px solid #86efac;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .bolt-prompt h3 {
      color: #16a34a;
      margin-top: 0;
    }
    .prompt-code {
      background: #1f2937;
      color: #d1d5db;
      padding: 15px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📬 New User Feedback</h1>
    <p style="margin: 0; opacity: 0.9;">${feedbackTypeLabel}</p>
  </div>
  
  <div class="content">
    <div class="section">
      <div class="label">Type:</div>
      <div class="value">${feedbackTypeLabel}</div>
      
      <div class="label">Priority:</div>
      <div class="value">${priorityEmoji} ${priority.toUpperCase()}</div>
      
      <div class="label">Title:</div>
      <div class="value"><strong>${title}</strong></div>
      
      <div class="label">Description:</div>
      <div class="value">${description}</div>
      
      <div class="label">Location in App:</div>
      <div class="value">${currentPage}</div>
      
      <div class="label">Submitted By:</div>
      <div class="value">${userName} (${userEmail})</div>
    </div>

    <div class="bolt-prompt">
      <h3>🤖 Suggested Bolt Prompt</h3>
      <p>Copy and paste this prompt into Bolt to implement this ${feedbackType === 'bug' ? 'fix' : 'change'}:</p>
      <div class="prompt-code">${boltPromptSuggestion}</div>
    </div>

    <div class="section">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        <strong>Next Steps:</strong><br>
        1. Review the feedback and priority level<br>
        2. Use the Bolt prompt suggestion above to implement the change<br>
        3. Update the feedback status in the Admin dashboard once completed
      </p>
    </div>
  </div>
  
  <div class="footer">
    <p>This is an automated message from your FreightOps CSP Management System</p>
    <p>Submitted on ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
  </div>
</body>
</html>
    `.trim();

    const emailPayload = {
      from: emailFrom,
      to: 'michael@gorocketshipping.com',
      subject: `[FreightOps Feedback] ${feedbackTypeLabel}: ${title}`,
      html: emailContent,
    };

    const auth = btoa(`${emailUsername}:${emailPassword}`);

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`SMTP2GO API error: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback email sent successfully' }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending feedback email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});