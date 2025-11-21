import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('app_role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.app_role !== 'admin') {
      throw new Error('This endpoint is only available to administrators');
    }

    console.log('🔍 Starting OAuth diagnostic for user:', user.id);

    // Get OAuth credentials from environment variables
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    // Get user's tokens
    const { data: userTokens } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get recent OAuth error logs
    const { data: errorLogs } = await supabaseServiceClient
      .from('oauth_error_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const diagnostics = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email
      },
      oauthCredentials: {
        exists: !!(googleClientId && googleClientSecret),
        clientId: googleClientId?.substring(0, 40) + '...',
        clientIdFull: googleClientId,
        clientSecretLength: googleClientSecret?.length,
        source: 'environment_variables'
      },
      userTokens: {
        exists: !!userTokens,
        emailAddress: userTokens?.email_address,
        accessTokenLength: userTokens?.access_token?.length,
        refreshTokenLength: userTokens?.refresh_token?.length,
        refreshTokenFirst30: userTokens?.refresh_token?.substring(0, 30) + '...',
        tokenExpiry: userTokens?.token_expiry,
        createdAt: userTokens?.created_at,
        updatedAt: userTokens?.updated_at,
        tokenAge: userTokens?.created_at ?
          Math.floor((Date.now() - new Date(userTokens.created_at).getTime()) / 1000 / 60) + ' minutes' :
          'N/A'
      },
      recentErrors: errorLogs?.map(log => ({
        type: log.error_type,
        message: log.error_message,
        timestamp: log.created_at,
        details: log.error_details
      })) || [],
      potentialIssues: []
    };

    // Analyze potential issues
    if (!googleClientId || !googleClientSecret) {
      diagnostics.potentialIssues.push('❌ No OAuth credentials configured in environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
    }

    if (!userTokens) {
      diagnostics.potentialIssues.push('⚠️ No tokens saved for this user');
    }

    if (userTokens && googleClientId && googleClientSecret) {
      // Test token refresh with current credentials
      console.log('🧪 Testing token refresh with current credentials...');

      try {
        const testRefreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: userTokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (testRefreshResponse.ok) {
          const refreshData = await testRefreshResponse.json();
          diagnostics.refreshTokenTest = {
            success: true,
            message: '✅ Refresh token is valid and working',
            newAccessTokenLength: refreshData.access_token?.length
          };
        } else {
          const errorData = await testRefreshResponse.json();
          diagnostics.refreshTokenTest = {
            success: false,
            error: errorData.error,
            errorDescription: errorData.error_description,
            httpStatus: testRefreshResponse.status,
            message: '❌ Refresh token failed validation',
            googleResponse: errorData
          };

          if (errorData.error === 'invalid_grant') {
            diagnostics.potentialIssues.push('❌ CRITICAL: invalid_grant error - Token is permanently invalid. Possible causes:');
            diagnostics.potentialIssues.push('   • OAuth client_id mismatch (token created with different client)');
            diagnostics.potentialIssues.push('   • OAuth client was deleted and recreated in Google Cloud Console');
            diagnostics.potentialIssues.push('   • Refresh token limit exceeded (100 per user per client)');
            diagnostics.potentialIssues.push('   • OAuth app is in Testing mode and tokens expired');
          }
        }
      } catch (testError) {
        diagnostics.refreshTokenTest = {
          success: false,
          error: testError.message,
          message: '❌ Error testing token refresh'
        };
      }
    }

    // Check token age
    if (userTokens?.created_at) {
      const ageMinutes = Math.floor((Date.now() - new Date(userTokens.created_at).getTime()) / 1000 / 60);
      if (ageMinutes < 2) {
        diagnostics.potentialIssues.push(`⚠️ Tokens are very fresh (${ageMinutes} minutes old) - if refresh is failing immediately, this indicates a client_id mismatch`);
      }
    }

    // Check if OAuth app might be in testing mode
    if (errorLogs && errorLogs.length > 0) {
      const recentInvalidGrants = errorLogs.filter(log =>
        log.error_details?.error === 'invalid_grant' ||
        log.error_message?.includes('invalid_grant')
      );

      if (recentInvalidGrants.length > 0) {
        diagnostics.potentialIssues.push(`❌ Found ${recentInvalidGrants.length} recent invalid_grant errors - OAuth client likely needs reconfiguration`);
      }
    }

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in diagnose-oauth:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
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
