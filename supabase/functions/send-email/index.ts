import { createClient } from 'jsr:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with user's token to respect RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      to,
      cc,
      subject,
      body,
      cspEventId,
      customerId,
      carrierId,
      trackReply = true,
      inReplyTo = null,
      threadId = null,
      impersonatedUserId = null,
    } = await req.json();

    if (!to || to.length === 0) {
      throw new Error('Recipient email is required');
    }

    // Use impersonated user ID if provided, otherwise use authenticated user
    const effectiveUserId = impersonatedUserId || user.id;

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('email, full_name, email_signature')
      .eq('id', effectiveUserId)
      .maybeSingle();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Try OAuth tokens first, fallback to app password
    const { data: oauthTokens } = await supabaseClient
      .from('user_gmail_tokens')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    const { data: appPasswordCreds } = await supabaseClient
      .from('user_gmail_credentials')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (!oauthTokens && !appPasswordCreds) {
      throw new Error('Gmail not connected. Please connect your Gmail account in Settings.');
    }

    let transporter;
    let fromEmail;

    if (oauthTokens) {
      // Get OAuth credentials from system settings
      const { data: oauthSettings } = await supabaseClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (!oauthSettings?.setting_value?.client_id) {
        throw new Error('Gmail OAuth not configured. Please contact administrator.');
      }

      // Use OAuth2 for SMTP with full credentials so nodemailer can refresh automatically
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          type: 'OAuth2',
          user: oauthTokens.email_address,
          clientId: oauthSettings.setting_value.client_id,
          clientSecret: oauthSettings.setting_value.client_secret,
          refreshToken: oauthTokens.refresh_token,
          accessToken: oauthTokens.access_token,
        },
      });

      fromEmail = oauthTokens.email_address;
    } else {
      // Fallback to app password
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: appPasswordCreds.email_address,
          pass: appPasswordCreds.app_password,
        },
      });

      fromEmail = appPasswordCreds.email_address;
    }

    const fromName = userProfile.full_name || fromEmail.split('@')[0];

    let bodyWithSignature = body;
    if (userProfile.email_signature) {
      bodyWithSignature += `\n\n${userProfile.email_signature}`;
    }

    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    let messageId;
    let generatedThreadId;

    if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('message_id, thread_id')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail) {
        generatedThreadId = parentEmail.thread_id;
        const threadPart = generatedThreadId.split('-').slice(0, 2).join('-');
        messageId = `<${timestamp}.${randomPart}@${fromEmail.split('@')[1]}>`;
      } else {
        const subjectSlug = subject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
        generatedThreadId = `${subjectSlug}-${timestamp}-${randomPart}`;
        messageId = `<${timestamp}.${randomPart}@${fromEmail.split('@')[1]}>`;
      }
    } else {
      const subjectSlug = subject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
      generatedThreadId = threadId || `${subjectSlug}-${timestamp}-${randomPart}`;
      messageId = `<${timestamp}.${randomPart}@${fromEmail.split('@')[1]}>`;
    }

    let trackingCode = `FO-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    
    if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('tracking_code')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail) {
        trackingCode = parentEmail.tracking_code;
      }
    }

    let foToken = null;
    if (trackReply && !inReplyTo) {
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('freightops_thread_tokens')
        .insert({
          token: trackingCode,
          thread_id: generatedThreadId,
          csp_event_id: cspEventId || null,
          customer_id: customerId || null,
          carrier_id: carrierId || null,
          created_by: effectiveUserId,
        })
        .select('token')
        .maybeSingle();

      if (!tokenError && tokenData) {
        foToken = tokenData.token;
      }
    } else if (inReplyTo) {
      const { data: parentEmail } = await supabaseClient
        .from('email_activities')
        .select('tracking_code, thread_id, metadata')
        .eq('message_id', inReplyTo)
        .maybeSingle();

      if (parentEmail?.metadata?.freightops_thread_token) {
        foToken = parentEmail.metadata.freightops_thread_token;
      }
    }

    let enhancedSubject = subject;
    if (!inReplyTo && foToken) {
      enhancedSubject = `[${foToken}] ${subject}`;
    }

    const mailOptions: any = {
      from: fromEmail,
      to: to.join(', '),
      subject: enhancedSubject,
      text: bodyWithSignature,
      messageId: messageId,
    };

    if (cc && cc.length > 0) {
      mailOptions.cc = cc.join(', ');
    }

    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = inReplyTo;
    }

    mailOptions.headers = {
      'X-CSP-Tracking-Code': trackingCode,
      'X-Entity-Type': cspEventId ? 'csp_event' : (customerId ? 'customer' : 'carrier'),
    };

    if (foToken) {
      mailOptions.headers['X-FreightOps-Token'] = foToken;
    }

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError: any) {
      console.error('SMTP Error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    const { data: insertedEmail, error: insertError } = await supabaseClient
      .from('email_activities')
      .insert({
        tracking_code: trackingCode,
        csp_event_id: cspEventId || null,
        customer_id: customerId || null,
        carrier_id: carrierId || null,
        thread_id: generatedThreadId,
        message_id: messageId,
        in_reply_to_message_id: inReplyTo,
        subject: enhancedSubject,
        from_email: fromEmail,
        from_name: fromName,
        to_emails: to,
        cc_emails: cc || [],
        body_text: bodyWithSignature,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        freightops_thread_token: foToken,
        owner_id: effectiveUserId,
        is_thread_starter: !inReplyTo,
        visible_to_team: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting email activity:', insertError);
      throw new Error('Email sent but failed to save to database');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId,
        trackingCode,
        threadId: generatedThreadId,
        emailActivity: insertedEmail,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
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
