import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisData {
  txnData: any[];
  loData: any[];
  summary?: string;
}

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

    const { cspEventId, analysisData } = await req.json() as { 
      cspEventId: string; 
      analysisData: AnalysisData 
    };

    if (!cspEventId || !analysisData) {
      throw new Error("Missing required parameters");
    }

    const { txnData = [], loData = [] } = analysisData;

    const totalShipments = Array.isArray(txnData) ? txnData.length : 0;
    const lostOpportunities = Array.isArray(loData) ? loData.length : 0;

    const carrierCounts: Record<string, number> = {};
    const carrierSpend: Record<string, number> = {};
    const laneCounts: Record<string, number> = {};
    const laneSpend: Record<string, number> = {};

    if (Array.isArray(txnData)) {
      txnData.forEach((txn: any) => {
        const carrier = txn.carrier || txn.Carrier || 'Unknown';
        const cost = parseFloat(txn.cost || txn.Bill || txn.bill || 0);
        const originCity = txn.origin_city || txn['Origin City'] || txn.OriginCity || '';
        const destCity = txn.dest_city || txn['Dest City'] || txn.DestCity || '';
        const lane = originCity && destCity ? `${originCity} → ${destCity}` : 'Unknown';

        carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
        carrierSpend[carrier] = (carrierSpend[carrier] || 0) + cost;
        laneCounts[lane] = (laneCounts[lane] || 0) + 1;
        laneSpend[lane] = (laneSpend[lane] || 0) + cost;
      });
    }

    const totalSpend = Object.values(carrierSpend).reduce((sum, val) => sum + val, 0);
    const topCarriers = Object.entries(carrierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([carrier, count]) => ({
        carrier,
        percentage: totalShipments > 0 ? ((count / totalShipments) * 100).toFixed(1) : '0',
      }));

    const carrierBreakdown = Object.entries(carrierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([carrier, count]) => ({
        carrier,
        shipments: count,
        spend: carrierSpend[carrier] || 0,
        percentage: totalShipments > 0 ? parseFloat(((count / totalShipments) * 100).toFixed(1)) : 0,
      }));

    const topLanes = Object.entries(laneCounts)
      .filter(([lane]) => lane !== 'Unknown')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lane, count]) => ({
        lane,
        shipments: count,
        spend: laneSpend[lane] || 0,
      }));

    const opportunityByCarrier: Record<string, { count: number; total: number }> = {};
    loData.forEach((lo: any) => {
      const selectedCost = parseFloat(lo.selected_cost || lo.Selected_Carrier_Cost || 0);
      const opportunityCost = parseFloat(lo.opportunity_cost || lo.LO_Carrier_Cost || 0);
      const diff = selectedCost - opportunityCost;
      const carrier = lo.selected_carrier || lo.Selected_Carrier_Name || 'Unknown';

      if (diff > 0) {
        if (!opportunityByCarrier[carrier]) {
          opportunityByCarrier[carrier] = { count: 0, total: 0 };
        }
        opportunityByCarrier[carrier].count++;
        opportunityByCarrier[carrier].total += diff;
      }
    });

    const missedSavingsByCarrier = Object.entries(opportunityByCarrier)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([carrier, data]) => ({
        carrier,
        opportunities: data.count,
        savings: data.total,
      }));

    const lostOpportunityLanes: string[] = [];
    const lostOpportunityTotal = loData.reduce((sum: number, lo: any) => {
      const selectedCost = parseFloat(lo.selected_cost || lo.Selected_Carrier_Cost || 0);
      const opportunityCost = parseFloat(lo.opportunity_cost || lo.LO_Carrier_Cost || 0);
      const diff = selectedCost - opportunityCost;
      const loadId = lo.load_id || lo.LoadId;

      if (diff > 0 && loadId) {
        lostOpportunityLanes.push(loadId);
      }
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    const uniqueLanes = new Set(lostOpportunityLanes).size;

    const topLine = `${totalShipments.toLocaleString()} shipments across ${uniqueLanes} lanes`;
    const topCarriersSummary = topCarriers.length > 0
      ? topCarriers.map((c: any) => `${c.carrier} (${c.percentage}%)`).join(', ')
      : 'No carrier data available';
    
    const lostOpportunitySummary = lostOpportunities > 0
      ? `$${Math.round(lostOpportunityTotal).toLocaleString()} in missed savings opportunities`
      : 'No lost opportunity data available';

    const summaryText = [
      `📊 **Shipment Analysis**`,
      `• ${topLine}`,
      `• Top carriers: ${topCarriersSummary}`,
      `• Total spend: $${Math.round(totalSpend).toLocaleString()}`,
      ``,
      `💰 **Opportunities**`,
      `• ${lostOpportunitySummary}`,
      `• Lost opportunities tracked: ${lostOpportunities}`,
    ].join('\n');

    const strategySummary = {
      generated_at: new Date().toISOString(),
      shipment_count: totalShipments,
      lane_count: uniqueLanes,
      total_spend: totalSpend,
      top_carriers: topCarriers,
      carrier_breakdown: carrierBreakdown,
      top_lanes: topLanes,
      missed_savings_by_carrier: missedSavingsByCarrier,
      lost_opportunity_count: lostOpportunities,
      lost_opportunity_total: lostOpportunityTotal,
      summary_text: summaryText,
    };

    const { error: updateError } = await supabase
      .from('csp_events')
      .update({
        strategy_summary: strategySummary,
        strategy_summary_updated_at: new Date().toISOString(),
      })
      .eq('id', cspEventId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: strategySummary 
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error generating strategy summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate strategy summary' 
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