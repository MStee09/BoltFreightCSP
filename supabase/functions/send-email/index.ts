import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  trackReply?: boolean;
  cspEventId?: string;
  customerId?: string;
  carrierId?: string;
  inReplyTo?: string;
  threadId?: string;
}

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'FO-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateThreadId(subject: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  return `${cleanSubject}-${timestamp}-${random}`;
}

function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}.${random}@${domain}>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      ? (await import('jsr:@supabase/supabase-js@2')).createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
      : null;

    if (!supabaseClient) {
      throw new Error('Supabase client not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const emailRequest: EmailRequest = await req.json();
    const {
      to,
      cc,
      subject,
      body,
      trackReply = true,
      cspEventId,
      customerId,
      carrierId,
      inReplyTo,
      threadId,
    } = emailRequest;

    const { data: credentials, error: credError } = await supabaseClient
      .from('user_gmail_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credError || !credentials) {
      console.error('Gmail credentials error:', credError);
      throw new Error('Gmail credentials not found. Please connect your Gmail account in Settings.');
    }

    const smtpHost = credentials.smtp_host || 'smtp.gmail.com';
    const smtpPort = credentials.smtp_port || 587;
    const smtpSecure = credentials.smtp_secure ?? false;
    const fromEmail = credentials.email_address;
    const smtpPassword = credentials.app_password;

    if (!smtpPassword) {
      throw new Error('Gmail App Password not configured. Please set it up in Settings.');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: fromEmail,
        pass: smtpPassword,
      },
    });

    let trackingCode = generateTrackingCode();

    const domain = fromEmail.split('@')[1] || 'gorocketshipping.com';
    const messageId = generateMessageId(domain);

    const mailOptions: any = {
      from: fromEmail,
      to: to.join(', '),
      subject: subject,
      text: body,
      messageId: messageId,
    };

    if (cc && cc.length > 0) {
      mailOptions.cc = cc.join(', ');
    }

    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = inReplyTo;

      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('tracking_code, thread_id')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail) {
        trackingCode = parentEmail.tracking_code;
      }
    }

    await transporter.sendMail(mailOptions);

    console.log('Email sent successfully');

    let foTokenData = null;
    if (trackReply && !inReplyTo) {
      const { data: tokenData } = await supabaseClient
        .from('freightops_thread_tokens')
        .insert({
          token: trackingCode,
          thread_id: threadId || generateThreadId(subject),
          csp_event_id: cspEventId || null,
          customer_id: customerId || null,
          carrier_id: carrierId || null,
          created_by: user.id,
        })
        .select('token')
        .maybeSingle();

      foTokenData = tokenData?.token;
    } else if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('tracking_code, thread_id, metadata')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail?.metadata?.freightops_thread_token) {
        foTokenData = parentEmail.metadata.freightops_thread_token;
      }
    }

    const { data: existingToken } = await supabaseClient
      .from('freightops_thread_tokens')
      .select('token')
      .eq('token', trackingCode)
      .maybeSingle();

    const foToken = existingToken?.token || foTokenData || (
      trackReply && !inReplyTo
        ? (await supabaseClient
            .from('freightops_thread_tokens')
            .insert({
              token: trackingCode,
              thread_id: threadId || generateThreadId(subject),
              csp_event_id: cspEventId || null,
              customer_id: customerId || null,
              carrier_id: carrierId || null,
              created_by: user.id,
            })
            .select('token')
            .maybeSingle()
          ).data?.token
        : null
    );

    let enhancedSubject = subject;
    if (!inReplyTo && foToken) {
      enhancedSubject = `[${foToken}] ${subject}`;
    }

    const generatedThreadId = threadId || generateThreadId(subject);

    const { data: insertedEmail, error: dbError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        message_id: messageId,
        thread_id: generatedThreadId,
        in_reply_to_message_id: inReplyTo || null,
        csp_event_id: cspEventId || null,
        customer_id: customerId || null,
        carrier_id: carrierId || null,
        subject: enhancedSubject,
        from_email: fromEmail,
        from_name: user.user_metadata?.full_name || fromEmail,
        to_emails: to,
        cc_emails: cc || [],
        body_text: body,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        created_by: user.id,
        is_thread_starter: !inReplyTo,
        metadata: {
          freightops_thread_token: foToken,
          owner_id: user.id,
          visible_to_team: true,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save email activity');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        trackingCode: trackingCode,
        messageId: messageId,
        threadId: generatedThreadId,
        emailId: insertedEmail.id,
      }),
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
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
      }),
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
