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
  const normalizedSubject = subject
    .toLowerCase()
    .replace(/^(re:|fwd?:|fw:)\s*/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  const randomSuffix = crypto.randomUUID().split('-')[0];
  return `${normalizedSubject}-${randomSuffix}`;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokens = await tokenResponse.json();
  return tokens.access_token;
}

async function sendViaGmailAPI(
  accessToken: string,
  fromEmail: string,
  to: string[],
  cc: string[],
  subject: string,
  body: string,
  trackingCode: string,
  foToken: string,
  inReplyTo?: string
): Promise<string> {
  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${to.join(', ')}`,
  ];

  if (cc && cc.length > 0) {
    messageParts.push(`Cc: ${cc.join(', ')}`);
  }

  messageParts.push(`Subject: ${subject}`);
  messageParts.push(`X-CSP-Tracking-Code: ${trackingCode}`);
  messageParts.push(`X-FreightOps-Token: ${foToken}`);
  messageParts.push(`Message-ID: <${foToken}@freightops.local>`);

  if (inReplyTo) {
    messageParts.push(`In-Reply-To: ${inReplyTo}`);
    messageParts.push(`References: ${inReplyTo}`);
  }

  messageParts.push('');
  messageParts.push(body);

  const message = messageParts.join('\r\n');
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error: ${errorText}`);
  }

  const result = await response.json();
  return result.id;
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

    const { data: oauthTokens, error: oauthError } = await supabaseClient
      .from('user_gmail_tokens')
      .select('email_address, access_token, refresh_token, token_expiry')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: appPasswordCreds, error: appPasswordError } = await supabaseClient
      .from('user_gmail_credentials')
      .select('email_address, app_password')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!oauthTokens && !appPasswordCreds) {
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

    let messageId: string;
    let fromEmail: string;

    if (oauthTokens) {
      fromEmail = oauthTokens.email_address;

      const tokenExpiry = new Date(oauthTokens.token_expiry);
      const now = new Date();
      let accessToken = oauthTokens.access_token;

      if (now >= tokenExpiry) {
        // Fetch OAuth credentials from database
        const { data: settingsData, error: settingsError } = await supabaseClient
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'gmail_oauth_credentials')
          .maybeSingle();

        if (settingsError || !settingsData?.setting_value) {
          throw new Error('Gmail OAuth credentials not configured. Please configure in Settings → Integrations.');
        }

        const credentials = settingsData.setting_value;
        const clientId = credentials.client_id ?? '';
        const clientSecret = credentials.client_secret ?? '';

        if (!clientId || !clientSecret) {
          throw new Error('Invalid OAuth credentials. Please reconfigure in Settings → Integrations.');
        }

        accessToken = await refreshAccessToken(
          oauthTokens.refresh_token,
          clientId,
          clientSecret
        );

        const newExpiry = new Date();
        newExpiry.setHours(newExpiry.getHours() + 1);

        await supabaseClient
          .from('user_gmail_tokens')
          .update({
            access_token: accessToken,
            token_expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Generate FreightOps token before sending
      const { data: foTokenData } = await supabaseClient.rpc(
        'generate_fo_thread_token',
        { p_csp_event_id: cspEventId || null }
      );
      const foToken = foTokenData || trackingCode;

      // Add FO token to subject if new thread
      let enhancedSubject = subject;
      if (!inReplyTo && foToken) {
        enhancedSubject = `[${foToken}] ${subject}`;
      }

      messageId = await sendViaGmailAPI(
        accessToken,
        fromEmail,
        to,
        cc,
        enhancedSubject,
        body,
        trackingCode,
        foToken,
        inReplyTo
      );
    } else {
      fromEmail = appPasswordCreds.email_address;

      const nodemailer = await import('npm:nodemailer@6.9.7');

      const transporter = nodemailer.default.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: appPasswordCreds.email_address,
          pass: appPasswordCreds.app_password,
        },
      });

      // Generate FreightOps token before sending
      const { data: foTokenData } = await supabaseClient.rpc(
        'generate_fo_thread_token',
        { p_csp_event_id: cspEventId || null }
      );
      const foToken = foTokenData || trackingCode;

      // Add FO token to subject if new thread
      let enhancedSubject = subject;
      if (!inReplyTo && foToken) {
        enhancedSubject = `[${foToken}] ${subject}`;
      }

      const mailOptions: any = {
        from: appPasswordCreds.email_address,
        to: to.join(', '),
        cc: cc && cc.length > 0 ? cc.join(', ') : undefined,
        subject: enhancedSubject,
        text: body,
        headers: {
          'X-CSP-Tracking-Code': trackingCode,
          'X-FreightOps-Token': foToken,
        },
        messageId: `<${foToken}@freightops.local>`,
      };

      if (inReplyTo) {
        mailOptions.inReplyTo = inReplyTo;
        mailOptions.headers['In-Reply-To'] = inReplyTo;
        mailOptions.headers['References'] = inReplyTo;
      }

      const info = await transporter.sendMail(mailOptions);
      messageId = info.messageId;
    }

    // Generate FreightOps token for thread tracking
    const { data: foTokenData } = await supabaseClient.rpc(
      'generate_fo_thread_token',
      { p_csp_event_id: cspEventId || null }
    );
    const foToken = foTokenData || trackingCode;

    // Add FO token to subject if it's a new thread
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
        freightops_thread_token: foToken,
        owner_id: user.id,
        visible_to_team: true,
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
        messageId,
        threadId: generatedThreadId,
        emailActivityId: insertedEmail?.id,
        foToken
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
