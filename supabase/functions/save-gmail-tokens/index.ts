import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    console.log('🔵 Starting save-gmail-tokens function');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('No authorization header');
    }

    console.log('🔵 Auth header present, verifying user...');

    // Verify the user with their JWT
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

    if (userError) {
      console.error('❌ User error:', userError);
      throw new Error('Unauthorized: ' + userError.message);
    }

    if (!user) {
      console.error('❌ No user found');
      throw new Error('Unauthorized: No user');
    }

    console.log('✅ User verified:', user.id);

    const { email_address, access_token, refresh_token, token_expiry } = await req.json();

    console.log('🔵 Received data:', {
      email_address,
      has_access_token: !!access_token,
      has_refresh_token: !!refresh_token,
      token_expiry
    });

    if (!email_address || !access_token || !refresh_token || !token_expiry) {
      console.error('❌ Missing required fields');
      throw new Error('Missing required fields');
    }

    console.log('🔵 Creating service role client...');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('🔵 Service role key present:', !!serviceRoleKey);

    // Use service role to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? ''
    );

    console.log('🔵 Deleting existing tokens for user:', user.id);

    // Delete existing tokens
    const { error: deleteError } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('⚠️ Delete error:', deleteError);
    } else {
      console.log('✅ Delete completed (or no existing tokens)');
    }

    console.log('🔵 Inserting new tokens...');

    // Insert new tokens
    const insertData = {
      user_id: user.id,
      email_address,
      access_token,
      refresh_token,
      token_expiry,
      updated_at: new Date().toISOString(),
    };

    console.log('🔵 Insert data:', {
      user_id: insertData.user_id,
      email_address: insertData.email_address,
      has_access_token: !!insertData.access_token,
      access_token_length: insertData.access_token?.length,
      has_refresh_token: !!insertData.refresh_token,
      refresh_token_length: insertData.refresh_token?.length,
      token_expiry: insertData.token_expiry
    });

    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .insert(insertData)
      .select();

    console.log('🔵 Insert result:', {
      hasData: !!insertedData,
      dataLength: insertedData?.length,
      hasError: !!insertError
    });

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw new Error(`Failed to save tokens: ${insertError.message}`);
    }

    if (!insertedData || insertedData.length === 0) {
      console.error('❌ No data returned after insert');
      throw new Error('No data returned after insert - possible RLS issue');
    }

    console.log('✅ Gmail tokens saved successfully');
    console.log('🔵 Inserted data:', {
      id: insertedData[0].id,
      user_id: insertedData[0].user_id,
      email: insertedData[0].email_address
    });

    // CRITICAL: Test if the refresh token actually works RIGHT NOW before returning success
    console.log('🧪 CRITICAL: Testing refresh token immediately...');

    const { data: oauthSettings } = await supabaseServiceClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'gmail_oauth_credentials')
      .maybeSingle();

    let tokenTestResult = {
      success: false,
      error: 'OAuth credentials not configured'
    };

    if (!oauthSettings?.setting_value?.client_id) {
      console.error('❌ CRITICAL: OAuth credentials not found in system_settings');

      // Delete the tokens we just saved since they can't be used
      await supabaseServiceClient
        .from('user_gmail_tokens')
        .delete()
        .eq('id', insertedData[0].id);

      throw new Error('OAuth credentials not configured in system settings');
    }

    console.log('🔍 DIAGNOSTIC: OAuth client_id from database:', oauthSettings.setting_value.client_id.substring(0, 30) + '...');
    console.log('🔍 DIAGNOSTIC: Refresh token (first 30 chars):', refresh_token.substring(0, 30) + '...');
    console.log('🔍 DIAGNOSTIC: Refresh token length:', refresh_token.length);

    // Try to refresh the token immediately - THIS IS THE CRITICAL TEST
    try {
      const testRefreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: oauthSettings.setting_value.client_id,
          client_secret: oauthSettings.setting_value.client_secret,
          refresh_token: refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (testRefreshResponse.ok) {
        const testRefreshData = await testRefreshResponse.json();
        console.log('✅ CRITICAL: Refresh token WORKS! New access token received:', testRefreshData.access_token.substring(0, 30) + '...');

        // Update the token with the refreshed access token
        await supabaseServiceClient
          .from('user_gmail_tokens')
          .update({
            access_token: testRefreshData.access_token,
            updated_at: new Date().toISOString()
          })
          .eq('id', insertedData[0].id);

        tokenTestResult = {
          success: true,
          message: 'Token refresh test passed'
        };
      } else {
        const errorData = await testRefreshResponse.json();
        console.error('❌ CRITICAL: Refresh token FAILED immediately!');
        console.error('❌ DIAGNOSTIC: Error from Google:', JSON.stringify(errorData));
        console.error('❌ DIAGNOSTIC: HTTP Status:', testRefreshResponse.status);
        console.error('❌ DIAGNOSTIC: This means the refresh token is ALREADY INVALID when we receive it!');
        console.error('❌ DIAGNOSTIC: Possible causes:');
        console.error('   1. OAuth client_id MISMATCH - different client used to get token vs refresh it');
        console.error('   2. OAuth client was deleted/recreated in Google Cloud Console');
        console.error('   3. Refresh token limit exceeded (100 per user per client)');
        console.error('   4. OAuth app is in Testing mode and needs Publishing');

        // Log to database for user visibility
        await supabaseServiceClient
          .from('oauth_error_logs')
          .insert({
            user_id: user.id,
            error_type: 'token_validation_failed_on_save',
            error_message: errorData.error || 'Unknown error',
            error_details: {
              ...errorData,
              http_status: testRefreshResponse.status,
              diagnostic: 'Token failed validation immediately after exchange',
              client_id_used: oauthSettings.setting_value.client_id.substring(0, 30) + '...',
              refresh_token_length: refresh_token.length
            },
            oauth_provider: 'gmail'
          });

        // Delete the invalid tokens
        console.log('🗑️ CRITICAL: Deleting invalid tokens from database');
        await supabaseServiceClient
          .from('user_gmail_tokens')
          .delete()
          .eq('id', insertedData[0].id);

        tokenTestResult = {
          success: false,
          error: `Token refresh failed: ${errorData.error || 'Unknown error'}`,
          errorDetails: errorData
        };

        // FAIL THE ENTIRE OPERATION - don't return success if tokens don't work
        throw new Error(`Gmail token validation failed: ${errorData.error || 'Unknown error'}. This usually means your OAuth client configuration needs attention. Error details: ${JSON.stringify(errorData)}`);
      }
    } catch (refreshError) {
      console.error('❌ CRITICAL: Error testing refresh:', refreshError.message);

      // If this is our thrown error, re-throw it
      if (refreshError.message.includes('Gmail token validation failed')) {
        throw refreshError;
      }

      // For network errors, still fail
      tokenTestResult = {
        success: false,
        error: `Token test error: ${refreshError.message}`
      };

      throw new Error(`Failed to test Gmail token: ${refreshError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: insertedData[0].user_id,
        email: insertedData[0].email_address,
        tokenId: insertedData[0].id,
        tokenTestResult
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ ERROR in save-gmail-tokens:', error);
    console.error('❌ Error stack:', error.stack);
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