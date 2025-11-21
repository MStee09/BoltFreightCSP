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
    console.log('🔵 === SEND EMAIL FUNCTION STARTED ===');
    console.log('🔵 Timestamp:', new Date().toISOString());

    const authHeader = req.headers.get('Authorization');
    console.log('🔵 Auth header present:', !!authHeader);

    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    console.log('🔵 Creating Supabase clients...');
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
    console.log('✅ Supabase clients created');

    console.log('🔵 Getting user from auth...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error('❌ User error:', userError);
      throw new Error('Unauthorized: ' + userError.message);
    }

    if (!user) {
      console.error('❌ No user found');
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.id);

    console.log('🔵 Parsing request body...');
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
    console.log('✅ Request body parsed');

    if (!to || to.length === 0) {
      console.error('❌ No recipient email provided');
      throw new Error('Recipient email is required');
    }

    const effectiveUserId = impersonatedUserId || user.id;

    console.log('🔍 Email send request:', {
      authenticatedUserId: user.id,
      effectiveUserId,
      isImpersonating: !!impersonatedUserId,
      to,
      subject
    });

    console.log('🔵 Fetching user profile...');
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('email, full_name, email_signature')
      .eq('id', effectiveUserId)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      throw new Error('Failed to fetch user profile: ' + profileError.message);
    }

    if (!userProfile) {
      console.error('❌ No user profile found for:', effectiveUserId);
      throw new Error('User profile not found');
    }
    console.log('✅ User profile loaded:', userProfile.email);

    // ALWAYS use service role to fetch tokens - bypasses RLS completely
    // This is safe because we already verified the user is authenticated above
    console.log('🔵 Fetching OAuth tokens from database...');
    const { data: oauthTokens, error: oauthError } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    console.log('📧 OAuth tokens query:', {
      effectiveUserId,
      hasTokens: !!oauthTokens,
      usingServiceRole: true,
      error: oauthError?.message
    });

    if (oauthError) {
      console.error('❌ OAuth tokens query error:', oauthError);
      throw new Error('Failed to fetch Gmail tokens: ' + oauthError.message);
    }

    let transporter;
    let fromEmail = userProfile.email;

    if (!oauthTokens) {
      console.error('❌ No OAuth tokens found for user:', effectiveUserId);
      throw new Error('Gmail not connected. Please connect your Gmail account in Settings → Integrations using the "Connect Gmail" button.');
    }

    console.log('✅ OAuth tokens found in database');

    if (oauthTokens) {
      // Get OAuth credentials from environment variables
      console.log('🔵 Loading OAuth credentials from environment variables...');
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      console.log('🔍 OAuth environment variables:', {
        hasClientId: !!googleClientId,
        hasClientSecret: !!googleClientSecret,
        clientIdPrefix: googleClientId?.substring(0, 30)
      });

      if (!googleClientId || !googleClientSecret) {
        console.error('❌ OAuth credentials not found in environment variables');
        throw new Error('Gmail OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.');
      }

      console.log('✅ OAuth credentials loaded from environment');

      let accessToken = oauthTokens.access_token;
      let tokenRefreshed = false;

      console.log('🔍 DIAGNOSTIC: Token details from database:', {
        email: oauthTokens.email_address,
        access_token_length: oauthTokens.access_token?.length,
        refresh_token_length: oauthTokens.refresh_token?.length,
        refresh_token_first_30: oauthTokens.refresh_token?.substring(0, 30) + '...',
        token_expiry: oauthTokens.token_expiry,
        created_at: oauthTokens.created_at,
        updated_at: oauthTokens.updated_at
      });

      console.log('🔍 DIAGNOSTIC: OAuth credentials being used:', {
        client_id: googleClientId?.substring(0, 30) + '...',
        client_secret_length: googleClientSecret?.length
      });

      try {
        console.log('🔄 Refreshing OAuth token for:', oauthTokens.email_address);

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: oauthTokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;

          await supabaseServiceClient
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
          console.error('❌ DIAGNOSTIC: Token refresh FAILED in send-email!');
          console.error('❌ DIAGNOSTIC: Error from Google:', JSON.stringify(errorData));
          console.error('❌ DIAGNOSTIC: HTTP Status:', tokenResponse.status);

          // Log the error to the database for debugging
          await supabaseServiceClient
            .from('oauth_error_logs')
            .insert({
              user_id: effectiveUserId,
              error_type: 'token_refresh_failed',
              error_message: errorData.error || 'Unknown error',
              error_details: {
                ...errorData,
                http_status: tokenResponse.status,
                client_id_used: googleClientId?.substring(0, 30) + '...',
                refresh_token_first_30: oauthTokens.refresh_token?.substring(0, 30) + '...',
                diagnostic: 'Token refresh failed when attempting to send email'
              },
              oauth_provider: 'gmail'
            });

          // ONLY delete tokens if the refresh token itself is revoked/invalid
          if (errorData.error === 'invalid_grant') {
            console.error('❌ DIAGNOSTIC: invalid_grant - This means:');
            console.error('   - The refresh token is INVALID or REVOKED');
            console.error('   - OR the client_id/client_secret used to refresh != the ones used to get the token');
            console.error('   - OR the OAuth client was deleted/recreated in Google Cloud Console');
            console.log('🗑️ Refresh token is permanently invalid, deleting...');
            await supabaseServiceClient
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
      console.log('🔵 Creating nodemailer transporter with OAuth2...');
      try {
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            type: 'OAuth2',
            user: oauthTokens.email_address,
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            refreshToken: oauthTokens.refresh_token,
            accessToken: accessToken,
          },
        });
        console.log('✅ Transporter created successfully');
        fromEmail = oauthTokens.email_address;
      } catch (transporterError) {
        console.error('❌ Failed to create transporter:', transporterError);
        throw new Error('Failed to create email transporter: ' + transporterError.message);
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

    console.log('🔵 Attempting to send email...');
    let emailSent = false;
    let sendError = null;

    try {
      console.log('🔵 Calling transporter.sendMail...');
      const result = await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log('✅ Email sent successfully!', result);
    } catch (sendErr) {
      console.error('❌ SEND EMAIL FAILED!');
      console.error('❌ Error type:', sendErr.name);
      console.error('❌ Error message:', sendErr.message);
      console.error('❌ Error code:', sendErr.code);
      console.error('❌ Full error:', JSON.stringify(sendErr, null, 2));
      sendError = sendErr;

      // ONLY delete OAuth tokens if it's specifically an auth error
      if (oauthTokens && sendErr.message &&
          (sendErr.message.includes('Invalid credentials') ||
           sendErr.message.includes('Invalid login') ||
           sendErr.message.includes('535'))) {
        console.log('🗑️ Authentication failed, deleting invalid OAuth tokens');
        await supabaseServiceClient
          .from('user_gmail_tokens')
          .delete()
          .eq('id', oauthTokens.id);
      }

      // Provide user-friendly error message
      const errorMsg = sendError.message || 'Unknown error';
      if (errorMsg.includes('Invalid credentials') || errorMsg.includes('535')) {
        throw new Error('Your Gmail connection has expired or is invalid. Please reconnect your Gmail account in Settings to send emails.');
      }
      throw new Error(`Failed to send email: ${errorMsg}`);
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
    console.error('❌❌❌ TOP LEVEL ERROR CAUGHT ❌❌❌');
    console.error('❌ Error type:', error?.constructor?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    const errorMsg = error.message || 'Unknown error';
    const isGmailAuthError =
      errorMsg.includes('expired or is invalid') ||
      errorMsg.includes('not connected') ||
      errorMsg.includes('Invalid credentials') ||
      errorMsg.includes('reconnect');

    console.error('❌ Returning error response:', {
      error: errorMsg,
      errorType: isGmailAuthError ? 'GMAIL_AUTH_ERROR' : 'GENERAL_ERROR',
      needsReconnect: isGmailAuthError
    });

    return new Response(
      JSON.stringify({
        error: errorMsg,
        errorType: isGmailAuthError ? 'GMAIL_AUTH_ERROR' : 'GENERAL_ERROR',
        needsReconnect: isGmailAuthError,
        stack: error?.stack
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
