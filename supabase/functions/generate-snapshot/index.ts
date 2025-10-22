import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: cspEvents } = await supabase
      .from('csp_events')
      .select('stage, status');

    const { data: interactions } = await supabase
      .from('interactions')
      .select('interaction_type')
      .gte('created_date', periodStart.toISOString())
      .lte('created_date', periodEnd.toISOString());

    const { data: tariffs } = await supabase
      .from('tariffs')
      .select('status');

    const stageBreakdown: Record<string, number> = {};
    cspEvents?.forEach((event: any) => {
      stageBreakdown[event.stage] = (stageBreakdown[event.stage] || 0) + 1;
    });

    const interactionBreakdown: Record<string, number> = {};
    interactions?.forEach((interaction: any) => {
      interactionBreakdown[interaction.interaction_type] = (interactionBreakdown[interaction.interaction_type] || 0) + 1;
    });

    const snapshotData = {
      report_type: 'monthly_summary',
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      user_id: MOCK_USER_ID,
      data: {
        totalCspEvents: cspEvents?.length || 0,
        stageBreakdown,
        totalInteractions: interactions?.length || 0,
        interactionBreakdown,
        activeTariffs: tariffs?.filter((t: any) => t.status === 'active').length || 0,
        totalTariffs: tariffs?.length || 0,
      },
    };

    const { data: snapshot, error } = await supabase
      .from('report_snapshots')
      .insert(snapshotData)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        snapshot,
        message: 'Snapshot created successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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