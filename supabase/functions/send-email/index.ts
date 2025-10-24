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
  inReplyTo?: string;
  threadId?: string;
}

function generateThreadId(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/^(re:|fwd?:|fw:)\s*/gi, '')
    .replace(/[^a-z0-9]+/g, '-');
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

    const { data: credentials, error: credError } = await supabaseClient
      .from('user_gmail_credentials')
      .select('email_address, app_password')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credError || !credentials) {
      throw new Error('Gmail not connected. Please connect in Settings.');
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
      inReplyTo,
      threadId,
    } = requestData;

    const nodemailer = await import('npm:nodemailer@6.9.7');

    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: credentials.email_address,
        pass: credentials.app_password,
      },
    });

    const mailOptions: any = {
      from: credentials.email_address,
      to: to.join(', '),
      cc: cc && cc.length > 0 ? cc.join(', ') : undefined,
      subject: subject,
      text: body,
      headers: {
        'X-CSP-Tracking-Code': trackingCode,
      },
    };

    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.headers['In-Reply-To'] = inReplyTo;
      mailOptions.headers['References'] = inReplyTo;
    }

    const info = await transporter.sendMail(mailOptions);

    const generatedThreadId = threadId || generateThreadId(subject);

    const { error: dbError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        message_id: info.messageId,
        thread_id: generatedThreadId,
        in_reply_to_message_id: inReplyTo || null,
        csp_event_id: cspEventId || null,
        customer_id: customerId || null,
        carrier_id: carrierId || null,
        subject,
        from_email: credentials.email_address,
        from_name: user.user_metadata?.full_name || credentials.email_address,
        to_emails: to,
        cc_emails: cc || [],
        body_text: body,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        created_by: user.id,
        is_thread_starter: !inReplyTo,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save email activity');
    }

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
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
