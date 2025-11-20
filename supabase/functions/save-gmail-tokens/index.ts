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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

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

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email_address, access_token, refresh_token, token_expiry } = await req.json();

    if (!email_address || !access_token || !refresh_token || !token_expiry) {
      throw new Error('Missing required fields');
    }

    console.log('Saving Gmail tokens for user:', user.id);

    // Use service role to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete existing tokens
    const { error: deleteError } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.warn('Error deleting existing tokens:', deleteError);
    }

    // Insert new tokens
    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from('user_gmail_tokens')
      .insert({
        user_id: user.id,
        email_address,
        access_token,
        refresh_token,
        token_expiry,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save tokens: ${insertError.message}`);
    }

    if (!insertedData) {
      throw new Error('No data returned after insert');
    }

    console.log('✅ Gmail tokens saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: insertedData.user_id,
        email: insertedData.email_address
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error saving Gmail tokens:', error);
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