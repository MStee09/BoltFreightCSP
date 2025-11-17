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

    // Create service role client for impersonation (bypasses RLS)
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    console.log('🔍 Email send request:', {
      authenticatedUserId: user.id,
      effectiveUserId,
      isImpersonating: !!impersonatedUserId
    });

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('email, full_name, email_signature')
      .eq('id', effectiveUserId)
      .maybeSingle();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // When impersonating, use service role client to bypass RLS
    const clientForCredentials = impersonatedUserId ? supabaseServiceClient : supabaseClient;

    // Try OAuth tokens first, fallback to app password
    const { data: oauthTokens, error: oauthError } = await clientForCredentials
      .from('user_gmail_tokens')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    console.log('📧 OAuth tokens query:', {
      effectiveUserId,
      hasTokens: !!oauthTokens,
      usingServiceRole: !!impersonatedUserId,
      error: oauthError?.message
    });

    const { data: appPasswordCreds, error: appPasswordError } = await clientForCredentials
      .from('user_gmail_credentials')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    console.log('🔑 App password query:', {
      effectiveUserId,
      hasCreds: !!appPasswordCreds,
      error: appPasswordError?.message
    });

    if (!oauthTokens && !appPasswordCreds) {
      const errorDetails = {
        oauthError: oauthError?.message,
        appPasswordError: appPasswordError?.message,
        effectiveUserId
      };
      console.error('❌ No Gmail credentials found:', errorDetails);
      throw new Error(`Gmail not connected. Please connect your Gmail account in Settings. Debug: ${JSON.stringify(errorDetails)}`);
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
    } else if (appPasswordCreds) {
      // Use App Password for SMTP
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

    const mailOptions: any = {
      from: `${userProfile.full_name || 'Team'} <${fromEmail}>`,
      to: to.join(', '),
      subject,
      html: body,
    };

    if (cc && cc.length > 0) {
      mailOptions.cc = cc.join(', ');
    }

    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = inReplyTo;
    }

    await transporter.sendMail(mailOptions);

    const activityData: any = {
      user_id: effectiveUserId,
      direction: 'outbound',
      subject,
      body,
      to_addresses: to,
      cc_addresses: cc || [],
      message_id: mailOptions.messageId,
      csp_event_id: cspEventId || null,
      customer_id: customerId || null,
      carrier_id: carrierId || null,
      thread_id: threadId,
      in_reply_to: inReplyTo,
      gmail_thread_id: null,
    };

    const { data: activity, error: activityError } = await supabaseClient
      .from('email_activities')
      .insert(activityData)
      .select()
      .single();

    if (activityError) {
      console.error('Error logging email activity:', activityError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: mailOptions.messageId,
        emailActivityId: activity?.id,
        threadId: threadId || mailOptions.messageId
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
