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

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/['\"\]]/g, ''));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map(v => v.replace(/['\"\]]/g, ''));
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
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

    // Fetch all carriers to create SCAC -> Name mapping
    console.log('=== FETCHING CARRIERS FOR SCAC MAPPING ===');
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('scac_code, name');

    if (carriersError) {
      console.error('Error fetching carriers:', carriersError);
    }

    // Create SCAC to Carrier Name mapping
    const scacToName: Record<string, string> = {};
    if (carriers) {
      carriers.forEach(carrier => {
        if (carrier.scac_code && carrier.name) {
          scacToName[carrier.scac_code.toUpperCase()] = carrier.name;
        }
      });
      console.log(`Created SCAC mapping for ${Object.keys(scacToName).length} carriers`);
    }

    // Helper function to resolve carrier name from SCAC
    const resolveCarrierName = (carrierValue: string): string => {
      if (!carrierValue || carrierValue === 'Unknown') return carrierValue;
      const upperValue = carrierValue.toUpperCase().trim();
      return scacToName[upperValue] || carrierValue;
    };

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
          let csvText = '';

          console.log(`Processing document: ${doc.file_name}`);
          console.log(`File path: ${doc.file_path}`);

          let pathMatch = doc.file_path.match(/\/documents\/(.+)$/);
          if (!pathMatch) {
            pathMatch = doc.file_path.match(/\/object\/public\/documents\/(.+)$/);
          }
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            console.log(`Extracted storage path: ${storagePath}`);

            const { data: fileData, error: downloadError } = await supabase.storage
              .from('documents')
              .download(storagePath);

            if (downloadError) {
              console.error(`Error downloading ${doc.file_name}:`, downloadError);
              console.error(`Error details:`, JSON.stringify(downloadError));
              continue;
            }

            console.log(`Successfully downloaded file, size: ${fileData.size} bytes`);
            csvText = await fileData.text();
            console.log(`CSV text length: ${csvText.length} characters`);
            console.log(`First 200 chars:`, csvText.substring(0, 200));
          } else {
            console.error(`Could not parse file path: ${doc.file_path}`);
            continue;
          }

          const parsedData = parseCSV(csvText);
          console.log(`Parsed ${parsedData.length} rows from ${doc.file_name}`);

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
      ? txnData.filter(txn => txn && (txn.carrier || txn.Carrier || txn['Carrier Name'] || txn.Carrier_Name || txn.CarrierName) && (txn.cost || txn.Bill || txn.bill || txn.TotalBill || txn['Total Bill'] || txn.Total_Bill || txn.TotalCost || txn['Total Cost'] || txn.Cost))
      : [];

    const totalShipments = validTxnData.length;
    const lostOpportunities = Array.isArray(loData) ? loData.length : 0;

    console.log(`Valid shipments (with carrier and cost): ${totalShipments}`);
    console.log(`Filtered out: ${(Array.isArray(txnData) ? txnData.length : 0) - totalShipments} rows`);

    const carrierCounts: Record<string, number> = {};
    const carrierSpend: Record<string, number> = {};
    const carrierOwnership: Record<string, { brokerage: number; customer_direct: number; not_specified: number }> = {};
    const laneCounts: Record<string, number> = {};
    const laneSpend: Record<string, number> = {};

    let brokerageSpend = 0;
    let brokerageShipments = 0;
    let customerDirectSpend = 0;
    let customerDirectShipments = 0;
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    const classifyOwnership = (ownership: string): 'brokerage' | 'customer_direct' | null => {
      if (!ownership || ownership.trim() === '') {
        return null;
      }
      const ownershipUpper = ownership.toUpperCase().trim();
      if (ownershipUpper === 'NOT SPECIFIED' || ownershipUpper === 'NOTSPECIFIED') {
        return null;
      }
      if (ownershipUpper.includes('ROCKET') || ownershipUpper.includes('PRIORITY 1') || ownershipUpper.includes('PRIORITY1')) {
        return 'brokerage';
      }
      if (ownershipUpper.includes('CUSTOMER') || ownershipUpper.includes('DIRECT')) {
        return 'customer_direct';
      }
      return null;
    };

    if (Array.isArray(validTxnData)) {
      validTxnData.forEach((txn: any, idx: number) => {
        const carrierRaw = txn.carrier || txn.Carrier || txn['Carrier Name'] || txn.Carrier_Name || txn.CarrierName || 'Unknown';
        const carrier = resolveCarrierName(carrierRaw);
        const costRaw = txn.cost || txn.Bill || txn.bill || txn.TotalBill || txn['Total Bill'] || txn.Total_Bill || txn.TotalCost || txn['Total Cost'] || txn.Cost || 0;
        const cost = parseFloat(String(costRaw).replace(/[$,]/g, ''));
        const ownership = txn.ownership || txn.Pricing_Ownership || txn['Pricing Ownership'] || txn.PricingOwnership || '';
        const ownershipType = classifyOwnership(ownership);
        const originCity = txn.origin_city || txn['Origin City'] || txn.OriginCity || txn.Origin_City || txn.Origin || '';
        const destCity = txn.dest_city || txn['Dest City'] || txn.DestCity || txn.Dest_City || txn.Destination || txn['Destination City'] || txn.DestinationCity || '';
        const lane = originCity && destCity ? `${originCity} → ${destCity}` : 'Unknown';

        const shipDateRaw = txn.ship_date || txn['Ship Date'] || txn.ShipDate || txn.date || txn.Date || '';
        if (shipDateRaw) {
          const shipDate = new Date(shipDateRaw);
          if (!isNaN(shipDate.getTime())) {
            if (!earliestDate || shipDate < earliestDate) {
              earliestDate = shipDate;
            }
            if (!latestDate || shipDate > latestDate) {
              latestDate = shipDate;
            }
          }
        }

        if (idx < 3) {
          console.log(`Row ${idx + 1}: carrier=${carrier}, ownership=${ownership}, type=${ownershipType}, cost=${cost}`);
        }

        carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
        carrierSpend[carrier] = (carrierSpend[carrier] || 0) + cost;

        if (!carrierOwnership[carrier]) {
          carrierOwnership[carrier] = { brokerage: 0, customer_direct: 0, not_specified: 0 };
        }
        if (ownershipType === 'brokerage') {
          carrierOwnership[carrier].brokerage++;
        } else if (ownershipType === 'customer_direct') {
          carrierOwnership[carrier].customer_direct++;
        } else {
          carrierOwnership[carrier].not_specified++;
        }

        if (ownershipType === 'brokerage') {
          brokerageSpend += cost;
          brokerageShipments++;
        } else if (ownershipType === 'customer_direct') {
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
      .map(([carrier, count]) => {
        const ownershipData = carrierOwnership[carrier] || { brokerage: 0, customer_direct: 0, not_specified: 0 };

        let ownershipType: string | null = null;
        const maxCount = Math.max(ownershipData.brokerage, ownershipData.customer_direct, ownershipData.not_specified);

        if (maxCount === 0) {
          ownershipType = null;
        } else if (ownershipData.brokerage === maxCount) {
          ownershipType = 'brokerage';
        } else if (ownershipData.customer_direct === maxCount) {
          ownershipType = 'customer_direct';
        } else {
          ownershipType = null;
        }

        return {
          carrier,
          shipments: count,
          spend: carrierSpend[carrier] || 0,
          percentage: totalShipments > 0 ? parseFloat(((count / totalShipments) * 100).toFixed(1)) : 0,
          ownership_type: ownershipType,
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
      const carrierRaw = lo.selected_carrier || lo.Selected_Carrier_Name || 'Unknown';
      const carrier = resolveCarrierName(carrierRaw);

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

      // Fetch custom strategy instructions and knowledge base from database
      const { data: aiSettings } = await supabase
        .from('ai_chatbot_settings')
        .select('strategy_instructions')
        .maybeSingle();

      const { data: knowledgeDocs } = await supabase
        .from('knowledge_base_documents')
        .select('title, content')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      let knowledgeBaseContent = '';
      if (knowledgeDocs && knowledgeDocs.length > 0) {
        knowledgeBaseContent = '\n\n**IMPORTANT: Company-Specific Knowledge Base (Use as Primary Reference)**\n\n';
        knowledgeBaseContent += 'The following documents contain company-specific policies, standards, and guidelines. Use this information when making strategic recommendations.\n\n';
        knowledgeBaseContent += knowledgeDocs.map(doc =>
          `### ${doc.title}\n${doc.content}`
        ).join('\n\n');
      }

      const customInstructions = aiSettings?.strategy_instructions?.trim();

      const defaultInstructions = `You are an expert logistics and procurement analyst. Analyze this shipment data and provide a comprehensive strategic summary for a CSP (Carrier Service Provider) bid.

Provide a detailed analysis covering:
1. **Executive Summary** - Key metrics and overall health
2. **Carrier Performance Analysis** - Spend concentration, diversification opportunities
3. **Savings Opportunities** - Specific carriers and lanes with the highest savings potential
4. **Strategic Recommendations** - 3-5 actionable recommendations prioritized by impact
5. **Risk Assessment** - Carrier concentration risks and market vulnerabilities

Format the response in markdown with clear sections. Be specific with numbers and percentages. Focus on actionable insights.`;

      const instructions = customInstructions || defaultInstructions;

      const prompt = `${instructions}

${knowledgeBaseContent}

Data:
${JSON.stringify(dataContext, null, 2)}`;

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
      date_range_start: earliestDate?.toISOString() || null,
      date_range_end: latestDate?.toISOString() || null,
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