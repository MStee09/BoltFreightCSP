import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendEmailRequest {
  trackingCode: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  cspEventId?: string;
  customerId?: string;
  carrierId?: string;
  gmailAccessToken: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const requestData: SendEmailRequest = await req.json();
    const {
      trackingCode,
      to,
      cc,
      subject,
      body,
      cspEventId,
      customerId,
      carrierId,
      gmailAccessToken,
    } = requestData;

    const emailContent = createEmail({ to, cc, subject, body });

    const gmailResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gmailAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: emailContent,
        }),
      }
    );

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    const gmailData = await gmailResponse.json();

    const { error: dbError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        csp_event_id: cspEventId || null,
        customer_id: customerId || null,
        carrier_id: carrierId || null,
        thread_id: gmailData.threadId,
        message_id: gmailData.id,
        subject,
        from_email: user.email,
        from_name: user.user_metadata?.full_name || user.email,
        to_emails: to,
        cc_emails: cc,
        body_text: body,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        created_by: user.id,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save email activity');
    }

    return new Response(
      JSON.stringify({ success: true, messageId: gmailData.id }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
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

function createEmail({ to, cc, subject, body }: {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}): string {
  const toLine = to.join(', ');
  const ccLine = cc.join(', ');

  const emailLines = [
    `To: ${toLine}`,
    `Cc: ${ccLine}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];

  const email = emailLines.join('\r\n');
  const encoder = new TextEncoder();
  const data = encoder.encode(email);
  const base64 = btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64;
}
