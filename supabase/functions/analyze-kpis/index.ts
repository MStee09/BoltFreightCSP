import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { data: { user } } = await supabase.auth.getUser(token || "");

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error("Unauthorized - Admin access required");
    }

    const { kpiId } = await req.json();

    const { data: kpiDef } = await supabase
      .from('kpi_definitions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!kpiDef && !kpiId) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active KPIs to analyze"
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const kpisToAnalyze = kpiId 
      ? [kpiDef]
      : (await supabase.from('kpi_definitions').select('*').eq('is_active', true)).data || [];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [cspEvents, stageHistory, emailActivities, interactions, tariffActivities] = await Promise.all([
      supabase.from('csp_events').select('*').gte('created_date', sixtyDaysAgo.toISOString()),
      supabase.from('csp_stage_history').select('*').gte('changed_at', sixtyDaysAgo.toISOString()),
      supabase.from('email_activities').select('*').gte('sent_at', sixtyDaysAgo.toISOString()),
      supabase.from('interactions').select('*').gte('created_date', sixtyDaysAgo.toISOString()),
      supabase.from('tariff_activities').select('*').gte('created_at', sixtyDaysAgo.toISOString()),
    ]);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI service not configured"
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    for (const kpi of kpisToAnalyze) {
      const kpiData = calculateKPIValue(kpi, {
        cspEvents: cspEvents.data || [],
        stageHistory: stageHistory.data || [],
        emailActivities: emailActivities.data || [],
        interactions: interactions.data || [],
        tariffActivities: tariffActivities.data || [],
        now,
        thirtyDaysAgo,
      });

      const periodStart = getPeriodStart(kpi.measurement_period, now);
      const periodEnd = now;

      await supabase.from('kpi_tracking').insert({
        kpi_id: kpi.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        actual_value: kpiData.actualValue,
        target_value: kpi.target_value,
        status: kpiData.status,
        contributing_data: kpiData.contributingData,
      });

      const aiAnalysis = await analyzeKPIWithAI(kpi, kpiData, openaiApiKey);

      await supabase.from('kpi_predictions').insert({
        kpi_id: kpi.id,
        target_period_end: getNextPeriodEnd(kpi.measurement_period, now).toISOString(),
        predicted_value: aiAnalysis.predictedValue,
        confidence_score: aiAnalysis.confidenceScore,
        likelihood_of_meeting_target: aiAnalysis.likelihoodOfMeetingTarget,
        key_factors: aiAnalysis.keyFactors,
        positive_indicators: aiAnalysis.positiveIndicators,
        negative_indicators: aiAnalysis.negativeIndicators,
        recommendations: aiAnalysis.recommendations,
        trend_direction: aiAnalysis.trendDirection,
        ai_analysis_summary: aiAnalysis.summary,
        data_quality_score: aiAnalysis.dataQualityScore,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: kpisToAnalyze.length,
        message: `Successfully analyzed ${kpisToAnalyze.length} KPI(s)`
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error analyzing KPIs:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function calculateKPIValue(kpi: any, data: any) {
  const { cspEvents, stageHistory, emailActivities, interactions, now, thirtyDaysAgo } = data;

  const recentCSPs = cspEvents.filter((e: any) => new Date(e.created_date) >= thirtyDaysAgo);
  const recentStageChanges = stageHistory.filter((s: any) => new Date(s.changed_at) >= thirtyDaysAgo);
  const recentEmails = emailActivities.filter((e: any) => new Date(e.sent_at) >= thirtyDaysAgo);
  const recentInteractions = interactions.filter((i: any) => new Date(i.created_date) >= thirtyDaysAgo);

  let actualValue = 0;
  let status = 'on_track';
  const contributingData: any = {};

  switch (kpi.kpi_type) {
    case 'win_rate':
      const wonDeals = recentCSPs.filter((e: any) => e.stage === 'won' || e.stage === 'live').length;
      const lostDeals = recentCSPs.filter((e: any) => e.stage === 'lost' || e.stage === 'not_awarded').length;
      const totalClosed = wonDeals + lostDeals;
      actualValue = totalClosed > 0 ? (wonDeals / totalClosed) * 100 : 0;
      contributingData.wonDeals = wonDeals;
      contributingData.lostDeals = lostDeals;
      contributingData.totalClosed = totalClosed;
      break;

    case 'avg_cycle_time':
      const completedCSPs = recentCSPs.filter((e: any) => e.stage === 'won' || e.stage === 'lost' || e.stage === 'live');
      if (completedCSPs.length > 0) {
        const cycleTimes = completedCSPs.map((e: any) => {
          const created = new Date(e.created_date);
          const completed = new Date(e.updated_at);
          return Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
        actualValue = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length;
        contributingData.completedDeals = completedCSPs.length;
        contributingData.avgDays = actualValue;
      }
      break;

    case 'email_response_rate':
      const outboundEmails = recentEmails.filter((e: any) => e.direction === 'outbound');
      const emailsWithReplies = outboundEmails.filter((e: any) => e.in_reply_to);
      actualValue = outboundEmails.length > 0 ? (emailsWithReplies.length / outboundEmails.length) * 100 : 0;
      contributingData.outboundEmails = outboundEmails.length;
      contributingData.emailsWithReplies = emailsWithReplies.length;
      break;

    case 'deals_closed':
      actualValue = recentCSPs.filter((e: any) => e.stage === 'won' || e.stage === 'live').length;
      contributingData.wonDeals = actualValue;
      break;

    case 'activity_volume':
      actualValue = recentInteractions.length + recentEmails.length + recentStageChanges.length;
      contributingData.interactions = recentInteractions.length;
      contributingData.emails = recentEmails.length;
      contributingData.stageChanges = recentStageChanges.length;
      break;

    default:
      actualValue = 0;
  }

  if (actualValue >= kpi.threshold_green) {
    status = actualValue > kpi.target_value * 1.1 ? 'exceeded' : 'on_track';
  } else if (actualValue >= kpi.threshold_yellow) {
    status = 'at_risk';
  } else {
    status = 'off_track';
  }

  return {
    actualValue,
    status,
    contributingData,
  };
}

async function analyzeKPIWithAI(kpi: any, kpiData: any, apiKey: string) {
  const prompt = `You are a business analytics AI analyzing KPI performance data.

KPI: ${kpi.name}
Description: ${kpi.description || 'N/A'}
Type: ${kpi.kpi_type}
Target: ${kpi.target_value} ${kpi.unit}
Current Value: ${kpiData.actualValue.toFixed(2)} ${kpi.unit}
Status: ${kpiData.status}
Measurement Period: ${kpi.measurement_period}

Contributing Data:
${JSON.stringify(kpiData.contributingData, null, 2)}

Based on this data, provide:
1. Predicted value for the next period (just the number)
2. Confidence score (0-100)
3. Likelihood of meeting target (0-100)
4. 3-5 key factors influencing performance
5. 2-3 positive indicators
6. 2-3 negative indicators or risks
7. 3-5 specific actionable recommendations
8. Trend direction (improving, stable, or declining)
9. Brief summary (2-3 sentences)
10. Data quality score (0-100)

Respond ONLY with valid JSON in this exact format:
{
  "predictedValue": number,
  "confidenceScore": number,
  "likelihoodOfMeetingTarget": number,
  "keyFactors": ["factor1", "factor2", ...],
  "positiveIndicators": ["indicator1", "indicator2", ...],
  "negativeIndicators": ["risk1", "risk2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "trendDirection": "improving|stable|declining",
  "summary": "brief summary",
  "dataQualityScore": number
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a business analytics expert. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  const result = await response.json();
  const aiResponse = JSON.parse(result.choices[0].message.content);

  return aiResponse;
}

function getPeriodStart(period: string, now: Date): Date {
  const date = new Date(now);
  switch (period) {
    case 'daily':
      date.setHours(0, 0, 0, 0);
      return date;
    case 'weekly':
      date.setDate(date.getDate() - date.getDay());
      date.setHours(0, 0, 0, 0);
      return date;
    case 'monthly':
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3);
      date.setMonth(quarter * 3, 1);
      date.setHours(0, 0, 0, 0);
      return date;
    case 'yearly':
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
      return date;
    default:
      return date;
  }
}

function getNextPeriodEnd(period: string, now: Date): Date {
  const date = new Date(now);
  switch (period) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      date.setHours(23, 59, 59, 999);
      return date;
    case 'weekly':
      date.setDate(date.getDate() + (7 - date.getDay()));
      date.setHours(23, 59, 59, 999);
      return date;
    case 'monthly':
      date.setMonth(date.getMonth() + 1, 0);
      date.setHours(23, 59, 59, 999);
      return date;
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3);
      date.setMonth((quarter + 1) * 3, 0);
      date.setHours(23, 59, 59, 999);
      return date;
    case 'yearly':
      date.setMonth(11, 31);
      date.setHours(23, 59, 59, 999);
      return date;
    default:
      return date;
  }
}