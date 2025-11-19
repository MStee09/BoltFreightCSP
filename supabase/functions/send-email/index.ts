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

    const clientForCredentials = impersonatedUserId ? supabaseServiceClient : supabaseClient;

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

    let transporter;
    let fromEmail = userProfile.email;

    if (oauthTokens) {
      const { data: oauthSettings } = await supabaseClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gmail_oauth_credentials')
        .maybeSingle();

      if (!oauthSettings?.setting_value?.client_id) {
        throw new Error('Gmail OAuth not configured. Please contact administrator.');
      }

      let accessToken = oauthTokens.access_token;
      let tokenRefreshed = false;

      try {
        console.log('🔄 Refreshing OAuth token for:', oauthTokens.email_address);

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

          await clientForCredentials
            .from('user_gmail_tokens')
            .update({
              access_token: accessToken,
              updated_at: new Date().toISOString()
            })
            .eq('id', oauthTokens.id);

          tokenRefreshed = true;
          console.log('✅ Token refreshed successfully');
        } else {
          const errorData = await tokenResponse.json();
          console.warn('⚠️ Token refresh failed:', errorData);
          
          // ONLY delete tokens if the refresh token itself is revoked/invalid
          if (errorData.error === 'invalid_grant') {
            console.log('🗑️ Refresh token is permanently invalid, deleting...');
            await clientForCredentials
              .from('user_gmail_tokens')
              .delete()
              .eq('id', oauthTokens.id);
            
            throw new Error('Your Gmail connection has expired or is invalid. Please reconnect your Gmail account in Settings to send emails.');
          }
          // For other errors (network, temporary issues), just log and try to use existing token
          console.log('⚠️ Temporary refresh error, attempting to use existing token');
        }
      } catch (refreshError) {
        // Only throw if we already deleted tokens above
        if (refreshError.message.includes('expired or is invalid')) {
          throw refreshError;
        }
        console.warn('⚠️ Token refresh error (will try existing token):', refreshError.message);
      }

      // Try to create transporter with OAuth
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
      fromEmail = oauthTokens.email_address;
    }

    if (!transporter && appPasswordCreds) {
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

    if (!transporter) {
      console.log('⚠️ No valid user credentials, falling back to admin credentials');

      const { data: adminProfiles } = await supabaseServiceClient
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1);

      if (adminProfiles && adminProfiles.length > 0) {
        const adminId = adminProfiles[0].id;

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
            fromEmail = adminOauthTokens.email_address;
            console.log('✅ Using admin OAuth credentials as fallback');
          }
        }

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
            fromEmail = adminAppPassword.email_address;
            console.log('✅ Using admin app password as fallback');
          }
        }
      }

      if (!transporter) {
        throw new Error('Unable to send email. No valid SMTP credentials available. Please connect your Gmail account in Settings → Integrations.');
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

    let emailSent = false;
    let sendError = null;

    try {
      await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log('✅ Email sent successfully');
    } catch (sendErr) {
      console.error('❌ Failed to send with user credentials:', sendErr.message);
      sendError = sendErr;

      // If user credentials failed and we're not impersonating, try admin fallback
      if (!impersonatedUserId) {
        console.log('🔄 Attempting admin credential fallback...');

        // ONLY delete OAuth tokens if it's specifically an auth error
        if (oauthTokens && sendErr.message && 
            (sendErr.message.includes('Invalid credentials') || 
             sendErr.message.includes('Invalid login') ||
             sendErr.message.includes('535'))) {
          console.log('🗑️ Authentication failed, deleting invalid OAuth tokens');
          await clientForCredentials
            .from('user_gmail_tokens')
            .delete()
            .eq('id', oauthTokens.id);
        }

        const { data: adminProfiles } = await supabaseServiceClient
          .from('user_profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('is_active', true)
          .limit(1);

        if (adminProfiles && adminProfiles.length > 0) {
          const adminId = adminProfiles[0].id;

          const { data: adminAppPassword } = await supabaseServiceClient
            .from('user_gmail_credentials')
            .select('*')
            .eq('user_id', adminId)
            .maybeSingle();

          if (adminAppPassword) {
            try {
              const adminTransporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                  user: adminAppPassword.email_address,
                  pass: adminAppPassword.app_password,
                },
              });

              await adminTransporter.sendMail(mailOptions);
              emailSent = true;
              console.log('✅ Email sent using admin app password fallback');
            } catch (adminErr) {
              console.error('❌ Admin app password failed:', adminErr.message);
            }
          }

          if (!emailSent) {
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

                  const adminOauthTransporter = nodemailer.createTransport({
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

                  await adminOauthTransporter.sendMail(mailOptions);
                  emailSent = true;
                  console.log('✅ Email sent using admin OAuth fallback');
                } catch (adminOauthErr) {
                  console.error('❌ Admin OAuth failed:', adminOauthErr.message);
                }
              }
            }
          }
        }
      }

      if (!emailSent) {
        // Provide user-friendly error message
        const errorMsg = sendError.message || 'Unknown error';
        if (errorMsg.includes('Invalid credentials') || errorMsg.includes('535')) {
          throw new Error('Your Gmail connection has expired or is invalid. Please reconnect your Gmail account in Settings to send emails.');
        }
        throw new Error(`Failed to send email: ${errorMsg}`);
      }
    }

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