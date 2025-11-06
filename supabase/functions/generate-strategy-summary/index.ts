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

function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
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

    const { cspEventId, analysisData, refresh = false } = await req.json() as {
      cspEventId: string;
      analysisData?: AnalysisData;
      refresh?: boolean;
    };

    if (!cspEventId) {
      throw new Error("Missing cspEventId");
    }

    let txnData: any[] = [];
    let loData: any[] = [];

    if (refresh || !analysisData) {
      console.log('=== FETCHING DOCUMENTS FROM STORAGE ===');

      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('csp_event_id', cspEventId)
        .in('document_type', ['transaction_detail', 'low_cost_opportunity']);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
        throw docsError;
      }

      console.log(`Found ${documents?.length || 0} documents`);

      for (const doc of documents || []) {
        try {
          const fileName = doc.file_path.split('/').pop();
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(`${doc.user_id}/${fileName}`);

          if (downloadError) {
            console.error(`Error downloading ${doc.file_name}:`, downloadError);
            continue;
          }

          const csvText = await fileData.text();
          const parsedData = parseCSV(csvText);

          if (doc.document_type === 'transaction_detail') {
            txnData = [...txnData, ...parsedData];
            console.log(`Loaded ${parsedData.length} rows from transaction detail`);
          } else if (doc.document_type === 'low_cost_opportunity') {
            loData = [...loData, ...parsedData];
            console.log(`Loaded ${parsedData.length} rows from low cost opportunity`);
          }
        } catch (error) {
          console.error(`Error processing document ${doc.file_name}:`, error);
        }
      }

      if (txnData.length === 0 && loData.length === 0) {
        throw new Error('No valid documents found for this CSP event');
      }
    } else {
      txnData = analysisData.txnData || [];
      loData = analysisData.loData || [];
    }

    console.log(`=== STRATEGY SUMMARY GENERATION ===`);
    console.log(`Raw txnData array length: ${Array.isArray(txnData) ? txnData.length : 'not an array'}`);
    console.log(`Raw loData array length: ${Array.isArray(loData) ? loData.length : 'not an array'}`);
    console.log(`Sample first 3 txn rows:`, txnData?.slice(0, 3));

    const validTxnData = Array.isArray(txnData)
      ? txnData.filter(txn => txn && (txn.carrier || txn.Carrier) && (txn.cost || txn.Bill || txn.bill))
      : [];

    const totalShipments = validTxnData.length;
    const lostOpportunities = Array.isArray(loData) ? loData.length : 0;

    console.log(`Valid shipments (with carrier and cost): ${totalShipments}`);
    console.log(`Filtered out: ${(Array.isArray(txnData) ? txnData.length : 0) - totalShipments} rows`);

    const carrierCounts: Record<string, number> = {};
    const carrierSpend: Record<string, number> = {};
    const carrierOwnership: Record<string, { rocket: number; priority1: number; customer_direct: number }> = {};
    const laneCounts: Record<string, number> = {};
    const laneSpend: Record<string, number> = {};

    let brokerageSpend = 0;
    let brokerageShipments = 0;
    let customerDirectSpend = 0;
    let customerDirectShipments = 0;

    const classifyOwnership = (ownership: string): 'brokerage' | 'customer_direct' => {
      const ownershipUpper = ownership?.toUpperCase() || '';
      if (ownershipUpper.includes('ROCKET') || ownershipUpper.includes('PRIORITY 1') || ownershipUpper.includes('PRIORITY1')) {
        return 'brokerage';
      }
      return 'customer_direct';
    };

    if (Array.isArray(validTxnData)) {
      validTxnData.forEach((txn: any, idx: number) => {
        const carrier = txn.carrier || txn.Carrier || 'Unknown';
        const costRaw = txn.cost || txn.Bill || txn.bill || 0;
        const cost = parseFloat(String(costRaw).replace(/[$,]/g, ''));
        const ownership = txn.ownership || txn.Pricing_Ownership || txn['Pricing Ownership'] || 'Customer Direct';
        const ownershipType = classifyOwnership(ownership);
        const originCity = txn.origin_city || txn['Origin City'] || txn.OriginCity || '';
        const destCity = txn.dest_city || txn['Dest City'] || txn.DestCity || '';
        const lane = originCity && destCity ? `${originCity} → ${destCity}` : 'Unknown';

        if (idx < 3) {
          console.log(`Row ${idx + 1}: carrier=${carrier}, ownership=${ownership}, type=${ownershipType}, cost=${cost}`);
        }

        carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
        carrierSpend[carrier] = (carrierSpend[carrier] || 0) + cost;

        if (!carrierOwnership[carrier]) {
          carrierOwnership[carrier] = { rocket: 0, priority1: 0, customer_direct: 0 };
        }
        const ownershipUpper = ownership?.toUpperCase() || '';
        if (ownershipUpper.includes('ROCKET')) {
          carrierOwnership[carrier].rocket++;
        } else if (ownershipUpper.includes('PRIORITY 1') || ownershipUpper.includes('PRIORITY1')) {
          carrierOwnership[carrier].priority1++;
        } else {
          carrierOwnership[carrier].customer_direct++;
        }

        if (ownershipType === 'brokerage') {
          brokerageSpend += cost;
          brokerageShipments++;
        } else {
          customerDirectSpend += cost;
          customerDirectShipments++;
        }

        laneCounts[lane] = (laneCounts[lane] || 0) + 1;
        laneSpend[lane] = (laneSpend[lane] || 0) + cost;
      });
    }

    const totalSpend = Object.values(carrierSpend).reduce((sum, val) => sum + val, 0);
    console.log(`Total Spend Calculated: $${totalSpend.toLocaleString()}`);
    console.log(`Total Shipments: ${totalShipments}`);

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
      .map(([carrier, count]) => {
        const ownershipData = carrierOwnership[carrier] || { rocket: 0, priority1: 0, customer_direct: 0 };
        const totalShipmentsForCarrier = ownershipData.rocket + ownershipData.priority1 + ownershipData.customer_direct;
        let primaryOwnership = 'customer_direct';

        if (ownershipData.rocket > ownershipData.priority1 && ownershipData.rocket > ownershipData.customer_direct) {
          primaryOwnership = 'brokerage';
        } else if (ownershipData.priority1 > ownershipData.rocket && ownershipData.priority1 > ownershipData.customer_direct) {
          primaryOwnership = 'brokerage';
        }

        return {
          carrier,
          shipments: count,
          spend: carrierSpend[carrier] || 0,
          percentage: totalShipments > 0 ? parseFloat(((count / totalShipments) * 100).toFixed(1)) : 0,
          ownership: primaryOwnership,
          ownership_breakdown: ownershipData,
        };
      });

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

    let summaryText = '';
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (openaiApiKey) {
      const dataContext = {
        totalShipments,
        uniqueLanes,
        totalSpend,
        topCarriers,
        carrierBreakdown,
        topLanes,
        missedSavingsByCarrier,
        lostOpportunities,
        lostOpportunityTotal
      };

      const prompt = `You are an expert logistics and procurement analyst. Analyze this shipment data and provide a comprehensive strategic summary for a CSP (Carrier Service Provider) bid.

Data:
${JSON.stringify(dataContext, null, 2)}

Provide a detailed analysis covering:
1. **Executive Summary** - Key metrics and overall health
2. **Carrier Performance Analysis** - Spend concentration, diversification opportunities
3. **Savings Opportunities** - Specific carriers and lanes with the highest savings potential
4. **Strategic Recommendations** - 3-5 actionable recommendations prioritized by impact
5. **Risk Assessment** - Carrier concentration risks and market vulnerabilities

Format the response in markdown with clear sections. Be specific with numbers and percentages. Focus on actionable insights.`;

      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are an expert logistics and procurement analyst specializing in carrier strategy and cost optimization." },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          summaryText = openaiData.choices[0]?.message?.content || '';
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    if (!summaryText) {
      const topLine = `${totalShipments.toLocaleString()} shipments across ${uniqueLanes} lanes`;
      const topCarriersSummary = topCarriers.length > 0
        ? topCarriers.map((c: any) => `${c.carrier} (${c.percentage}%)`).join(', ')
        : 'No carrier data available';

      const lostOpportunitySummary = lostOpportunities > 0
        ? `$${Math.round(lostOpportunityTotal).toLocaleString()} in missed savings opportunities`
        : 'No lost opportunity data available';

      summaryText = [
        `📊 **Shipment Analysis**`,
        `• ${topLine}`,
        `• Top carriers: ${topCarriersSummary}`,
        `• Total spend: $${Math.round(totalSpend).toLocaleString()}`,
        ``,
        `💰 **Opportunities**`,
        `• ${lostOpportunitySummary}`,
        `• Lost opportunities tracked: ${lostOpportunities}`,
      ].join('\n');
    }

    const brokeragePercentage = totalSpend > 0 ? (brokerageSpend / totalSpend) * 100 : 0;
    const customerDirectPercentage = totalSpend > 0 ? (customerDirectSpend / totalSpend) * 100 : 0;

    console.log(`=== BROKERAGE CLASSIFICATION ===`);
    console.log(`Brokerage Spend: $${brokerageSpend.toLocaleString()} (${brokeragePercentage.toFixed(1)}%)`);
    console.log(`Customer Direct Spend: $${customerDirectSpend.toLocaleString()} (${customerDirectPercentage.toFixed(1)}%)`);
    console.log(`Total: $${totalSpend.toLocaleString()}`);

    const strategySummary = {
      generated_at: new Date().toISOString(),
      shipment_count: totalShipments,
      lane_count: uniqueLanes,
      total_spend: totalSpend,
      brokerage_spend: brokerageSpend,
      brokerage_shipments: brokerageShipments,
      brokerage_percentage: brokeragePercentage,
      customer_direct_spend: customerDirectSpend,
      customer_direct_shipments: customerDirectShipments,
      customer_direct_percentage: customerDirectPercentage,
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