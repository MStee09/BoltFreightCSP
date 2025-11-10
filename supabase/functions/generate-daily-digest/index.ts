import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId } = await req.json().catch(() => ({ userId: null }));

    if (userId) {
      // Generate for specific user
      const digest = await generateDigestForUser(supabase, userId);
      return new Response(
        JSON.stringify({ success: true, digest }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      // Generate for all active users
      const results = await generateDigestsForAllUsers(supabase);
      return new Response(
        JSON.stringify({ success: true, results }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error generating daily digest:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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

async function generateDigestsForAllUsers(supabase: any) {
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .eq('is_active', true);

  if (!users || users.length === 0) {
    return { users_processed: 0, digests_created: 0 };
  }

  let created = 0;
  for (const user of users) {
    try {
      await generateDigestForUser(supabase, user.id);
      created++;
    } catch (error) {
      console.error(`Failed to generate digest for user ${user.id}:`, error);
    }
  }

  return { users_processed: users.length, digests_created: created };
}

async function generateDigestForUser(supabase: any, userId: string) {
  const today = new Date().toISOString().split('T')[0];

  // Check if digest already exists for today
  const { data: existing } = await supabase
    .from('daily_digests')
    .select('id')
    .eq('user_id', userId)
    .eq('digest_date', today)
    .single();

  if (existing) {
    return { skipped: true, reason: 'Digest already exists for today' };
  }

  // Get expiring tariffs (next 90 days)
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const { data: expiringTariffs } = await supabase
    .from('tariffs')
    .select(`
      id,
      tariff_reference_id,
      expiry_date,
      status,
      renewal_csp_event_id,
      customers(id, name),
      carriers(id, name)
    `)
    .eq('status', 'active')
    .lte('expiry_date', ninetyDaysFromNow.toISOString())
    .gte('expiry_date', new Date().toISOString())
    .order('expiry_date', { ascending: true })
    .limit(5);

  // Get stalled CSPs (no update in 7+ days, not in Awarded/Declined)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: stalledCsps } = await supabase
    .from('csp_events')
    .select(`
      id,
      title,
      stage,
      updated_at,
      csp_owner,
      customers(id, name)
    `)
    .eq('status', 'active')
    .not('stage', 'in', '(Awarded,Declined)')
    .lte('updated_at', sevenDaysAgo.toISOString())
    .order('updated_at', { ascending: true })
    .limit(5);

  // Get pending SOPs (waiting for review)
  const { data: pendingSops } = await supabase
    .from('tariff_sops')
    .select(`
      id,
      title,
      status,
      created_at,
      tariff_family_id
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(5);

  // Build action items
  const actionItems = [];

  if (expiringTariffs && expiringTariffs.length > 0) {
    const urgentCount = expiringTariffs.filter(t => {
      const daysUntilExpiry = Math.floor(
        (new Date(t.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30;
    }).length;

    if (urgentCount > 0) {
      actionItems.push({
        priority: 'high',
        type: 'expiring_tariff',
        message: `${urgentCount} tariff${urgentCount > 1 ? 's' : ''} expiring within 30 days`,
        action: 'Review and start renewal process',
      });
    }
  }

  if (stalledCsps && stalledCsps.length > 0) {
    actionItems.push({
      priority: 'medium',
      type: 'stalled_csp',
      message: `${stalledCsps.length} CSP${stalledCsps.length > 1 ? 's' : ''} with no activity in 7+ days`,
      action: 'Follow up with carriers or advance pipeline',
    });
  }

  if (pendingSops && pendingSops.length > 0) {
    actionItems.push({
      priority: 'low',
      type: 'pending_sop',
      message: `${pendingSops.length} SOP${pendingSops.length > 1 ? 's' : ''} awaiting review`,
      action: 'Review and approve SOPs',
    });
  }

  // Build summary
  const summary = {
    generated_at: new Date().toISOString(),
    total_items: actionItems.length,
    priorities: {
      high: actionItems.filter(a => a.priority === 'high').length,
      medium: actionItems.filter(a => a.priority === 'medium').length,
      low: actionItems.filter(a => a.priority === 'low').length,
    },
  };

  // Insert digest
  const { data: digest, error } = await supabase
    .from('daily_digests')
    .insert({
      user_id: userId,
      digest_date: today,
      summary,
      expiring_tariffs: expiringTariffs || [],
      stalled_csps: stalledCsps || [],
      pending_sops: pendingSops || [],
      action_items: actionItems,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return digest;
}
