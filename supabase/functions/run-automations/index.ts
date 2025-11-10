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

    const { ruleType } = await req.json().catch(() => ({ ruleType: 'all' }));

    const results = {
      autoRenewalCsp: null as any,
      carrierFollowup: null as any,
      validationReminder: null as any,
    };

    // Run Auto-Renewal CSP automation
    if (ruleType === 'all' || ruleType === 'auto_renewal_csp') {
      results.autoRenewalCsp = await runAutoRenewalCSP(supabase);
    }

    // Run Carrier Follow-up automation
    if (ruleType === 'all' || ruleType === 'carrier_followup_reminder') {
      results.carrierFollowup = await runCarrierFollowup(supabase);
    }

    // Run Validation Reminder automation
    if (ruleType === 'all' || ruleType === 'validation_reminder') {
      results.validationReminder = await runValidationReminder(supabase);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error running automations:', error);
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

async function runAutoRenewalCSP(supabase: any) {
  const startTime = Date.now();
  const logId = crypto.randomUUID();

  try {
    // Get the rule config
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('rule_type', 'auto_renewal_csp')
      .eq('is_enabled', true)
      .single();

    if (!rule) {
      return { skipped: true, reason: 'Rule not enabled' };
    }

    // Create log entry
    await supabase.from('automation_logs').insert({
      id: logId,
      rule_id: rule.id,
      rule_type: 'auto_renewal_csp',
      status: 'running',
      trigger_data: { triggered_at: new Date().toISOString() },
    });

    const daysBeforeExpiry = rule.trigger_condition.days_before_expiry || 90;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);

    // Find tariffs expiring within threshold that don't have renewal CSP
    const { data: expiringTariffs } = await supabase
      .from('tariffs')
      .select('id, tariff_family_id, customer_id, expiry_date, tariff_reference_id')
      .lte('expiry_date', targetDate.toISOString())
      .gte('expiry_date', new Date().toISOString())
      .eq('status', 'active')
      .is('renewal_csp_event_id', null);

    if (!expiringTariffs || expiringTariffs.length === 0) {
      await supabase
        .from('automation_logs')
        .update({
          status: 'success',
          result_data: { tariffs_processed: 0, csps_created: 0 },
          execution_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      return { tariffs_processed: 0, csps_created: 0 };
    }

    // Group by family to avoid duplicates
    const familyMap = new Map();
    expiringTariffs.forEach(t => {
      if (!familyMap.has(t.tariff_family_id)) {
        familyMap.set(t.tariff_family_id, t);
      }
    });

    const cspsCreated = [];

    // Create renewal CSP for each family
    for (const tariff of familyMap.values()) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', tariff.customer_id)
        .single();

      const expiryDate = new Date(tariff.expiry_date);
      const quarter = Math.ceil((expiryDate.getMonth() + 1) / 3);
      const year = expiryDate.getFullYear();

      const { data: newCsp, error: cspError } = await supabase
        .from('csp_events')
        .insert({
          title: `Q${quarter} ${year} Renewal - ${customer?.name || 'Customer'}`,
          customer_id: tariff.customer_id,
          stage: 'Planning',
          related_tariff_family_id: tariff.tariff_family_id,
          due_date: expiryDate.toISOString(),
          status: 'active',
          metadata: {
            auto_created: true,
            trigger: 'expiring_tariff',
            original_tariff_id: tariff.id,
            expiry_date: tariff.expiry_date,
          },
        })
        .select()
        .single();

      if (!cspError && newCsp) {
        // Link tariffs to new CSP
        await supabase
          .from('tariffs')
          .update({ renewal_csp_event_id: newCsp.id })
          .eq('tariff_family_id', tariff.tariff_family_id);

        // Log activity
        await supabase.from('tariff_activities').insert({
          tariff_family_id: tariff.tariff_family_id,
          csp_event_id: newCsp.id,
          activity_type: 'renewal_csp_created',
          title: `Auto-created renewal CSP: ${newCsp.title}`,
          description: `System automatically created renewal negotiation for expiring tariff`,
          is_system: true,
          metadata: {
            automation: 'auto_renewal_csp',
            expiry_date: tariff.expiry_date,
          },
        });

        cspsCreated.push(newCsp.id);
      }
    }

    await supabase
      .from('automation_logs')
      .update({
        status: 'success',
        result_data: {
          tariffs_processed: familyMap.size,
          csps_created: cspsCreated.length,
          csp_ids: cspsCreated,
        },
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    return {
      tariffs_processed: familyMap.size,
      csps_created: cspsCreated.length,
    };
  } catch (error) {
    await supabase
      .from('automation_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    throw error;
  }
}

async function runCarrierFollowup(supabase: any) {
  const startTime = Date.now();
  const logId = crypto.randomUUID();

  try {
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('rule_type', 'carrier_followup_reminder')
      .eq('is_enabled', true)
      .single();

    if (!rule) {
      return { skipped: true, reason: 'Rule not enabled' };
    }

    await supabase.from('automation_logs').insert({
      id: logId,
      rule_id: rule.id,
      rule_type: 'carrier_followup_reminder',
      status: 'running',
      trigger_data: { triggered_at: new Date().toISOString() },
    });

    const daysSinceInvite = rule.trigger_condition.days_since_invite || 5;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceInvite);

    // Find CSP carrier assignments without responses
    const { data: assignments } = await supabase
      .from('csp_carrier_assignments')
      .select(`
        *,
        csp_events!inner(id, title, csp_owner, stage),
        carriers!inner(id, name)
      `)
      .eq('status', 'invited')
      .lte('invited_at', cutoffDate.toISOString());

    if (!assignments || assignments.length === 0) {
      await supabase
        .from('automation_logs')
        .update({
          status: 'success',
          result_data: { carriers_processed: 0, alerts_created: 0 },
          execution_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      return { carriers_processed: 0, alerts_created: 0 };
    }

    const alertsCreated = [];

    for (const assignment of assignments) {
      const daysSince = Math.floor(
        (Date.now() - new Date(assignment.invited_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const { data: alert, error } = await supabase
        .from('alerts')
        .insert({
          type: 'carrier_no_response',
          severity: 'medium',
          message: `${assignment.carriers.name} hasn't responded in ${daysSince} days`,
          entity_type: 'csp_event',
          entity_id: assignment.csp_event_id,
          assigned_to: assignment.csp_events.csp_owner,
          metadata: {
            carrier_id: assignment.carrier_id,
            carrier_name: assignment.carriers.name,
            csp_title: assignment.csp_events.title,
            days_since_invite: daysSince,
            automation: 'carrier_followup_reminder',
          },
        })
        .select()
        .single();

      if (!error) {
        alertsCreated.push(alert.id);
      }
    }

    await supabase
      .from('automation_logs')
      .update({
        status: 'success',
        result_data: {
          carriers_processed: assignments.length,
          alerts_created: alertsCreated.length,
        },
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    return {
      carriers_processed: assignments.length,
      alerts_created: alertsCreated.length,
    };
  } catch (error) {
    await supabase
      .from('automation_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    throw error;
  }
}

async function runValidationReminder(supabase: any) {
  const startTime = Date.now();
  const logId = crypto.randomUUID();

  try {
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('rule_type', 'validation_reminder')
      .eq('is_enabled', true)
      .single();

    if (!rule) {
      return { skipped: true, reason: 'Rule not enabled' };
    }

    await supabase.from('automation_logs').insert({
      id: logId,
      rule_id: rule.id,
      rule_type: 'validation_reminder',
      status: 'running',
      trigger_data: { triggered_at: new Date().toISOString() },
    });

    const daysAfterActivation = rule.trigger_condition.days_after_activation || 30;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAfterActivation);

    // Find tariffs activated 30 days ago
    const { data: tariffs } = await supabase
      .from('tariffs')
      .select(`
        id,
        tariff_family_id,
        tariff_reference_id,
        effective_date,
        customer_id,
        customers(name)
      `)
      .eq('status', 'active')
      .lte('effective_date', targetDate.toISOString())
      .gte('effective_date', new Date(targetDate.getTime() - 24 * 60 * 60 * 1000).toISOString());

    if (!tariffs || tariffs.length === 0) {
      await supabase
        .from('automation_logs')
        .update({
          status: 'success',
          result_data: { tariffs_processed: 0, alerts_created: 0 },
          execution_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      return { tariffs_processed: 0, alerts_created: 0 };
    }

    const alertsCreated = [];

    for (const tariff of tariffs) {
      const { data: alert, error } = await supabase
        .from('alerts')
        .insert({
          type: 'validation_reminder',
          severity: 'low',
          message: `Time to validate performance for ${tariff.tariff_reference_id || 'tariff'}`,
          entity_type: 'tariff',
          entity_id: tariff.id,
          metadata: {
            tariff_id: tariff.id,
            customer_name: tariff.customers?.name,
            effective_date: tariff.effective_date,
            days_since_activation: daysAfterActivation,
            automation: 'validation_reminder',
          },
        })
        .select()
        .single();

      if (!error) {
        alertsCreated.push(alert.id);
      }
    }

    await supabase
      .from('automation_logs')
      .update({
        status: 'success',
        result_data: {
          tariffs_processed: tariffs.length,
          alerts_created: alertsCreated.length,
        },
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    return {
      tariffs_processed: tariffs.length,
      alerts_created: alertsCreated.length,
    };
  } catch (error) {
    await supabase
      .from('automation_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    throw error;
  }
}
