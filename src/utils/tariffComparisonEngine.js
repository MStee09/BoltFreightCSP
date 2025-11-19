import { differenceInDays } from 'date-fns';

export const analyzeTariffCompetitiveness = (customerDirectTariffs, blanketTariffs, cspTariffs) => {
  const analysis = {
    totalDirectTariffs: customerDirectTariffs.length,
    totalBlanketTariffs: blanketTariffs.length,
    totalCspTariffs: cspTariffs.length,
    blanketCoverageRate: 0,
    cspCoverageRate: 0,
    recommendations: []
  };

  const totalTariffs = customerDirectTariffs.length || 1;

  analysis.blanketCoverageRate = Math.round((blanketTariffs.length / totalTariffs) * 100);
  analysis.cspCoverageRate = Math.round((cspTariffs.length / totalTariffs) * 100);

  if (analysis.blanketCoverageRate < 30) {
    analysis.recommendations.push({
      type: 'opportunity',
      message: `Low blanket coverage (${analysis.blanketCoverageRate}%). Consider expanding blanket programs.`,
      priority: 'high'
    });
  }

  if (analysis.blanketCoverageRate > 60) {
    analysis.recommendations.push({
      type: 'success',
      message: `Strong blanket adoption (${analysis.blanketCoverageRate}%). Customer is well-positioned.`,
      priority: 'low'
    });
  }

  return analysis;
};

export const identifyCarrierBlockers = (customerDirectTariffs, carriers = []) => {
  const today = new Date();
  const blockers = [];

  customerDirectTariffs.forEach(tariff => {
    const carrier = carriers.find(c => c.id === tariff.carrier_id);
    if (!carrier) return;

    const daysUntilExpiry = tariff.expiry_date
      ? differenceInDays(new Date(tariff.expiry_date), today)
      : null;

    const isActive = !daysUntilExpiry || daysUntilExpiry > 0;

    blockers.push({
      carrierId: carrier.id,
      carrierName: carrier.name,
      carrierScac: carrier.scac_code,
      tariffId: tariff.id,
      tariffRef: tariff.tariff_reference_id,
      expiryDate: tariff.expiry_date,
      daysUntilExpiry,
      isActive,
      reason: isActive
        ? `Active Customer Direct tariff (expires in ${daysUntilExpiry} days)`
        : 'Customer Direct tariff'
    });
  });

  return blockers.filter(b => b.isActive);
};

export const findExpirationOpportunities = (customerDirectTariffs, carriers = [], daysWindow = 90) => {
  const today = new Date();
  const opportunities = [];

  customerDirectTariffs.forEach(tariff => {
    if (!tariff.expiry_date) return;

    const daysUntilExpiry = differenceInDays(new Date(tariff.expiry_date), today);

    if (daysUntilExpiry > 0 && daysUntilExpiry <= daysWindow) {
      const carrier = carriers.find(c => c.id === tariff.carrier_id);

      opportunities.push({
        tariffId: tariff.id,
        tariffRef: tariff.tariff_reference_id,
        carrierId: tariff.carrier_id,
        carrierName: carrier?.name || 'Unknown',
        carrierScac: carrier?.scac_code,
        expiryDate: tariff.expiry_date,
        daysUntilExpiry,
        priority: daysUntilExpiry <= 30 ? 'high' : daysUntilExpiry <= 60 ? 'medium' : 'low',
        action: `Plan CSP outreach for ${carrier?.name || 'carrier'} before ${new Date(tariff.expiry_date).toLocaleDateString()}`
      });
    }
  });

  return opportunities.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
};

export const calculateTariffMetrics = (tariffs, customerId) => {
  const today = new Date();

  const metrics = {
    total: tariffs.length,
    byOwnership: {
      customer_direct: 0,
      blanket: 0,
      rocket_csp: 0,
      rocket_blanket: 0
    },
    expiring: {
      next30Days: 0,
      next60Days: 0,
      next90Days: 0
    },
    active: 0,
    expired: 0,
    averageAge: 0
  };

  tariffs.forEach(tariff => {
    metrics.byOwnership[tariff.ownership_type] = (metrics.byOwnership[tariff.ownership_type] || 0) + 1;

    if (tariff.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(tariff.expiry_date), today);

      if (daysUntilExpiry > 0) {
        metrics.active++;

        if (daysUntilExpiry <= 30) metrics.expiring.next30Days++;
        if (daysUntilExpiry <= 60) metrics.expiring.next60Days++;
        if (daysUntilExpiry <= 90) metrics.expiring.next90Days++;
      } else {
        metrics.expired++;
      }
    }
  });

  return metrics;
};

export const generateAIInsights = (customerDirectTariffs, blanketTariffs, cspTariffs, carriers = []) => {
  const insights = [];
  const today = new Date();

  const blockers = identifyCarrierBlockers(customerDirectTariffs, carriers);
  if (blockers.length > 0) {
    insights.push({
      type: 'carrier_blockers',
      icon: 'shield',
      title: 'Carrier Blockers Identified',
      message: `${blockers.length} carrier${blockers.length === 1 ? '' : 's'} cannot be competitively bid due to Customer Direct tariffs: ${blockers.map(b => b.carrierScac || b.carrierName).join(', ')}`,
      data: blockers,
      severity: 'warning'
    });
  }

  const opportunities = findExpirationOpportunities(customerDirectTariffs, carriers, 90);
  if (opportunities.length > 0) {
    const topOpportunities = opportunities.filter(o => o.priority === 'high');
    insights.push({
      type: 'expiration_opportunities',
      icon: 'clock',
      title: 'CSP Opportunities',
      message: `${opportunities.length} Customer Direct tariff${opportunities.length === 1 ? '' : 's'} expiring in next 90 days${topOpportunities.length > 0 ? `. ${topOpportunities.length} high priority` : ''}`,
      data: opportunities,
      severity: topOpportunities.length > 0 ? 'high' : 'medium'
    });
  }

  const competitiveness = analyzeTariffCompetitiveness(customerDirectTariffs, blanketTariffs, cspTariffs);
  if (competitiveness.recommendations.length > 0) {
    insights.push({
      type: 'competitiveness_analysis',
      icon: 'trending-up',
      title: 'Blanket vs Direct Analysis',
      message: competitiveness.recommendations[0].message,
      data: competitiveness,
      severity: competitiveness.recommendations[0].priority
    });
  }

  const availableCarriers = carriers.filter(c =>
    !blockers.some(b => b.carrierId === c.id)
  );

  if (availableCarriers.length > 0) {
    insights.push({
      type: 'recommended_targets',
      icon: 'target',
      title: 'Recommended CSP Targets',
      message: `${availableCarriers.length} carrier${availableCarriers.length === 1 ? '' : 's'} available for next CSP event`,
      data: availableCarriers.slice(0, 10),
      severity: 'info'
    });
  }

  return insights;
};

export const compareTariffToAlternatives = (targetTariff, alternativeTariffs) => {
  const comparison = {
    targetTariff: {
      id: targetTariff.id,
      ref: targetTariff.tariff_reference_id,
      type: targetTariff.ownership_type
    },
    alternatives: [],
    recommendation: ''
  };

  alternativeTariffs.forEach(alt => {
    comparison.alternatives.push({
      id: alt.id,
      ref: alt.tariff_reference_id,
      type: alt.ownership_type,
      comparison: 'comparable'
    });
  });

  if (comparison.alternatives.length > 0) {
    comparison.recommendation = `${comparison.alternatives.length} alternative tariff${comparison.alternatives.length === 1 ? '' : 's'} available for comparison`;
  } else {
    comparison.recommendation = 'No alternative tariffs available for comparison';
  }

  return comparison;
};

export const assessRiskLevel = (tariff) => {
  const today = new Date();

  if (!tariff.expiry_date) {
    return { level: 'unknown', message: 'No expiry date set' };
  }

  const daysUntilExpiry = differenceInDays(new Date(tariff.expiry_date), today);

  if (daysUntilExpiry <= 0) {
    return { level: 'critical', message: 'Tariff has expired' };
  }

  if (daysUntilExpiry <= 30) {
    return { level: 'high', message: 'Expires within 30 days' };
  }

  if (daysUntilExpiry <= 60) {
    return { level: 'medium', message: 'Expires within 60 days' };
  }

  if (daysUntilExpiry <= 90) {
    return { level: 'low', message: 'Expires within 90 days' };
  }

  return { level: 'none', message: 'No immediate risk' };
};
