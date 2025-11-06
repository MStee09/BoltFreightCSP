import { supabase } from '../api/supabaseClient';
import { Carrier } from '../api/entities';

export const createStrategySnapshot = async ({
  txnData,
  customerId = null,
  cspEventId = null,
  userId,
  carriers = [],
  notes = null
}) => {
  try {
    if (!txnData || txnData.length === 0) {
      console.log('No transaction data to create snapshot');
      return null;
    }

    const totalShipments = txnData.length;
    const totalSpend = txnData.reduce((sum, row) => sum + (parseFloat(row.cost) || 0), 0);

    const uniqueLanes = new Set();
    txnData.forEach(row => {
      if (row.origin_city && row.dest_city) {
        uniqueLanes.add(`${row.origin_city}-${row.dest_city}`);
      }
    });
    const laneCount = uniqueLanes.size;

    const getCarrierType = (carrierIdentifier) => {
      if (!carrierIdentifier) return 'customer_direct';

      const identifier = carrierIdentifier.toUpperCase();
      const carrier = carriers.find(c =>
        c.scac_code?.toUpperCase() === identifier ||
        c.name?.toUpperCase() === identifier
      );

      return carrier?.carrier_type || 'customer_direct';
    };

    const getCarrierName = (carrierIdentifier) => {
      if (!carrierIdentifier) return 'Unknown';

      const identifier = carrierIdentifier.toUpperCase();
      const carrier = carriers.find(c =>
        c.scac_code?.toUpperCase() === identifier ||
        c.name?.toUpperCase() === identifier
      );

      return carrier?.name || carrierIdentifier;
    };

    let brokerageSpend = 0;
    let brokerageShipments = 0;
    let customerDirectSpend = 0;
    let customerDirectShipments = 0;

    const carrierStats = {};
    const modeStats = {};

    txnData.forEach(row => {
      const cost = parseFloat(row.cost) || 0;
      const carrier = row.carrier;
      const mode = row.mode || 'Unknown';
      const carrierType = getCarrierType(carrier);

      if (carrierType === 'brokerage') {
        brokerageSpend += cost;
        brokerageShipments++;
      } else {
        customerDirectSpend += cost;
        customerDirectShipments++;
      }

      if (!carrierStats[carrier]) {
        carrierStats[carrier] = {
          carrier,
          carrier_name: getCarrierName(carrier),
          carrier_type: carrierType,
          spend: 0,
          shipments: 0
        };
      }
      carrierStats[carrier].spend += cost;
      carrierStats[carrier].shipments++;

      if (!modeStats[mode]) {
        modeStats[mode] = {
          mode,
          brokerage_spend: 0,
          brokerage_shipments: 0,
          customer_direct_spend: 0,
          customer_direct_shipments: 0,
          total_spend: 0,
          total_shipments: 0
        };
      }

      if (carrierType === 'brokerage') {
        modeStats[mode].brokerage_spend += cost;
        modeStats[mode].brokerage_shipments++;
      } else {
        modeStats[mode].customer_direct_spend += cost;
        modeStats[mode].customer_direct_shipments++;
      }
      modeStats[mode].total_spend += cost;
      modeStats[mode].total_shipments++;
    });

    const brokeragePercentage = totalSpend > 0 ? (brokerageSpend / totalSpend) * 100 : 0;
    const customerDirectPercentage = totalSpend > 0 ? (customerDirectSpend / totalSpend) * 100 : 0;

    const carrierBreakdown = Object.values(carrierStats)
      .sort((a, b) => b.spend - a.spend)
      .map(c => ({
        ...c,
        percentage: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0
      }));

    const topBrokerageCarriers = carrierBreakdown
      .filter(c => c.carrier_type === 'brokerage')
      .slice(0, 5);

    const topCustomerDirectCarriers = carrierBreakdown
      .filter(c => c.carrier_type === 'customer_direct')
      .slice(0, 5);

    const modeBreakdown = Object.values(modeStats).map(m => ({
      ...m,
      brokerage_percentage: m.total_spend > 0 ? (m.brokerage_spend / m.total_spend) * 100 : 0,
      customer_direct_percentage: m.total_spend > 0 ? (m.customer_direct_spend / m.total_spend) * 100 : 0
    }));

    const snapshot = {
      snapshot_date: new Date().toISOString(),
      customer_id: customerId,
      csp_event_id: cspEventId,
      total_spend: totalSpend,
      total_shipments: totalShipments,
      lane_count: laneCount,
      brokerage_spend: brokerageSpend,
      brokerage_percentage: brokeragePercentage,
      brokerage_shipments: brokerageShipments,
      customer_direct_spend: customerDirectSpend,
      customer_direct_percentage: customerDirectPercentage,
      customer_direct_shipments: customerDirectShipments,
      mode_breakdown: modeBreakdown,
      carrier_breakdown: carrierBreakdown,
      top_brokerage_carriers: topBrokerageCarriers,
      top_customer_direct_carriers: topCustomerDirectCarriers,
      created_by: userId,
      notes
    };

    const { data, error } = await supabase
      .from('strategy_snapshots')
      .insert(snapshot)
      .select()
      .single();

    if (error) {
      console.error('Failed to create strategy snapshot:', error);
      throw error;
    }

    console.log('Strategy snapshot created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating strategy snapshot:', error);
    return null;
  }
};

export const getSnapshotTrends = async ({ customerId = null, cspEventId = null, limit = 12 }) => {
  try {
    let query = supabase
      .from('strategy_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: true })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else if (cspEventId) {
      query = query.eq('csp_event_id', cspEventId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching snapshot trends:', error);
    return [];
  }
};

export const backfillSnapshotsFromCspEvents = async (userId) => {
  try {
    const { data: cspEvents, error: eventsError } = await supabase
      .from('csp_events')
      .select('id, customer_id, strategy_summary, strategy_summary_updated_at')
      .not('strategy_summary', 'is', null)
      .order('strategy_summary_updated_at', { ascending: true });

    if (eventsError) throw eventsError;

    if (!cspEvents || cspEvents.length === 0) {
      console.log('No CSP events with strategy summaries found');
      return [];
    }

    const carriers = await Carrier.list();
    const getCarrierType = (carrierScac) => {
      const carrier = carriers.find(c => c.scac_code?.toUpperCase() === carrierScac?.toUpperCase());
      return carrier?.carrier_type || 'customer_direct';
    };

    const snapshots = [];

    for (const event of cspEvents) {
      const summary = event.strategy_summary;
      if (!summary.carrier_breakdown) continue;

      const { data: existingSnapshot } = await supabase
        .from('strategy_snapshots')
        .select('id')
        .eq('csp_event_id', event.id)
        .maybeSingle();

      if (existingSnapshot) continue;

      let brokerageSpend = 0;
      let customerDirectSpend = 0;
      let brokerageShipments = 0;
      let customerDirectShipments = 0;

      const carrierBreakdown = summary.carrier_breakdown.map(c => {
        const carrierType = getCarrierType(c.carrier);
        const spend = c.spend || 0;
        const shipments = c.shipments || 0;

        if (carrierType === 'brokerage') {
          brokerageSpend += spend;
          brokerageShipments += shipments;
        } else {
          customerDirectSpend += spend;
          customerDirectShipments += shipments;
        }

        return {
          ...c,
          carrier_type: carrierType
        };
      });

      const totalSpend = brokerageSpend + customerDirectSpend;
      const brokeragePercentage = totalSpend > 0 ? (brokerageSpend / totalSpend) * 100 : 0;
      const customerDirectPercentage = totalSpend > 0 ? (customerDirectSpend / totalSpend) * 100 : 0;

      const snapshot = {
        snapshot_date: event.strategy_summary_updated_at || new Date().toISOString(),
        customer_id: event.customer_id,
        csp_event_id: event.id,
        total_spend: summary.total_spend || totalSpend,
        total_shipments: summary.shipment_count || 0,
        lane_count: summary.lane_count || 0,
        brokerage_spend: brokerageSpend,
        brokerage_percentage: brokeragePercentage,
        brokerage_shipments: brokerageShipments,
        customer_direct_spend: customerDirectSpend,
        customer_direct_percentage: customerDirectPercentage,
        customer_direct_shipments: customerDirectShipments,
        carrier_breakdown: carrierBreakdown,
        top_brokerage_carriers: carrierBreakdown.filter(c => c.carrier_type === 'brokerage').slice(0, 5),
        top_customer_direct_carriers: carrierBreakdown.filter(c => c.carrier_type === 'customer_direct').slice(0, 5),
        mode_breakdown: {},
        created_by: userId,
        notes: 'Backfilled from CSP event strategy summary'
      };

      snapshots.push(snapshot);
    }

    if (snapshots.length > 0) {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .insert(snapshots)
        .select();

      if (error) throw error;
      console.log(`Backfilled ${snapshots.length} snapshots from CSP events`);
      return data;
    }

    return [];
  } catch (error) {
    console.error('Error backfilling snapshots:', error);
    return [];
  }
};
