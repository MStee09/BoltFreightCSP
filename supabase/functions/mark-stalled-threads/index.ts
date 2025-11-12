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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: threads, error: fetchError } = await supabaseClient
      .from('email_threads')
      .select('id, last_activity_at, status')
      .in('status', ['active', 'awaiting_reply'])
      .lt('last_activity_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!threads || threads.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No threads to mark as stalled', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const threadIds = threads.map(t => t.id);

    const { error: updateError } = await supabaseClient
      .from('email_threads')
      .update({ status: 'stalled', updated_at: new Date().toISOString() })
      .in('id', threadIds);

    if (updateError) {
      throw updateError;
    }

    console.log(`Marked ${threads.length} threads as stalled`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Marked ${threads.length} threads as stalled`,
        count: threads.length,
        threadIds,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error marking stalled threads:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
