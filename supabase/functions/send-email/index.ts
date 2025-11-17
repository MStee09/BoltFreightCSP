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

    console.log('\ud83d\udd0d Email send request:', {
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

    console.log('\ud83d\udce7 OAuth tokens query:', {
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

    console.log('\ud83d\udd11 App password query:', {
      effectiveUserId,
      hasCreds: !!appPasswordCreds,
      error: appPasswordError?.message
    });

    let transporter;
    let fromEmail = userProfile.email;
    let shouldDeleteInvalidTokens = false;
    let invalidTokenId = null;

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

      // Manually refresh the access token if needed
      let accessToken = oauthTokens.access_token;

      try {
        console.log('\ud83d\udd04 Refreshing OAuth token for:', oauthTokens.email_address);

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: oauthSettings.setting_value.client_id,
            client_secret: oauthSettings.setting_value.client_secret,
            refresh_token: oauthTokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;

          // Update the token in the database
          await clientForCredentials
            .from('user_gmail_tokens')
            .update({
              access_token: accessToken,
              updated_at: new Date().toISOString()
            })
            .eq('id', oauthTokens.id);

          console.log('\u2705 Token refreshed successfully');
        } else {
          const errorData = await tokenResponse.text();
          console.warn('\u26a0\ufe0f Token refresh failed, will delete invalid tokens:', errorData);
          shouldDeleteInvalidTokens = true;
          invalidTokenId = oauthTokens.id;
        }
      } catch (refreshError) {
        console.warn('\u26a0\ufe0f Token refresh error:', refreshError.message);
        shouldDeleteInvalidTokens = true;
        invalidTokenId = oauthTokens.id;
      }

      // If token refresh failed, delete invalid tokens and fall back to admin credentials
      if (shouldDeleteInvalidTokens) {
        console.log('\ud83d\uddd1\ufe0f Deleting invalid OAuth tokens');
        await clientForCredentials
          .from('user_gmail_tokens')
          .delete()
          .eq('id', invalidTokenId);

        // Don't create transporter here, fall through to use admin credentials below
      } else {
        // Use OAuth2 for SMTP
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
          accessToken: accessToken,
        },
        });
      }
    }

    // If no transporter yet, try app password
    if (!transporter && appPasswordCreds) {
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
    }

    // If still no transporter, fall back to admin's credentials
    if (!transporter) {
      console.log('\u26a0\ufe0f No valid user credentials, falling back to admin credentials');

      // Try to find an admin with working credentials
      const { data: adminProfiles } = await supabaseServiceClient
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1);

      if (adminProfiles && adminProfiles.length > 0) {
        const adminId = adminProfiles[0].id;

        // Try admin's OAuth first
        const { data: adminOauthTokens } = await supabaseServiceClient
          .from('user_gmail_tokens')
          .select('*')
          .eq('user_id', adminId)
          .maybeSingle();

        if (adminOauthTokens) {
          const { data: oauthSettings } = await supabaseClient
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'gmail_oauth_credentials')
            .maybeSingle();

          if (oauthSettings?.setting_value?.client_id) {
            // Refresh admin's token
            let adminAccessToken = adminOauthTokens.access_token;
            try {
              const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: oauthSettings.setting_value.client_id,
                  client_secret: oauthSettings.setting_value.client_secret,
                  refresh_token: adminOauthTokens.refresh_token,
                  grant_type: 'refresh_token',
                }),
              });

              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                adminAccessToken = tokenData.access_token;
                await supabaseServiceClient
                  .from('user_gmail_tokens')
                  .update({
                    access_token: adminAccessToken,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', adminOauthTokens.id);
              }
            } catch (e) {
              console.warn('Admin token refresh failed:', e.message);
            }

            transporter = nodemailer.createTransport({
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              auth: {
                type: 'OAuth2',
                user: adminOauthTokens.email_address,
                clientId: oauthSettings.setting_value.client_id,
                clientSecret: oauthSettings.setting_value.client_secret,
                refreshToken: adminOauthTokens.refresh_token,
                accessToken: adminAccessToken,
              },
            });
            console.log('\u2705 Using admin OAuth credentials as fallback');
          }
        }

        // Try admin's app password if OAuth didn't work
        if (!transporter) {
          const { data: adminAppPassword } = await supabaseServiceClient
            .from('user_gmail_credentials')
            .select('*')
            .eq('user_id', adminId)
            .maybeSingle();

          if (adminAppPassword) {
            transporter = nodemailer.createTransport({
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              auth: {
                user: adminAppPassword.email_address,
                pass: adminAppPassword.app_password,
              },
            });
            console.log('\u2705 Using admin app password as fallback');
          }
        }
      }

      if (!transporter) {
        throw new Error('Unable to send email. No valid SMTP credentials available. Please contact your administrator.');
      }
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
