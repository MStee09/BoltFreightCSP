


export function createPageUrl(pageName: string) {
    const [path, query] = pageName.split('?');
    const processedPath = path.toLowerCase().replace(/ /g, '-');
    return query ? `/${processedPath}?${query}` : `/${processedPath}`;
}

export function formatCspStage(stage: string): string {
    const stageLabels: Record<string, string> = {
        'discovery': '1️⃣ Discovery',
        'data_room_ready': '2️⃣ Data Room Ready',
        'carrier_invites_sent': '3️⃣ Carrier Invites Sent',
        'carrier_submissions': '4️⃣ Carrier Submissions',
        'round_2_optimization': '5️⃣ Round 2 / Optimization',
        'award_tariff_finalization': '6️⃣ Award & Tariff Finalization',
        'implementation': '7️⃣ Implementation',
        'validation_monitoring': '8️⃣ Validation & Monitoring',
        'renewal_watch': '9️⃣ Renewal Watch'
    };
    return stageLabels[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const CSP_STAGES = [
    "discovery",
    "data_room_ready",
    "carrier_invites_sent",
    "carrier_submissions",
    "round_2_optimization",
    "award_tariff_finalization",
    "implementation",
    "validation_monitoring",
    "renewal_watch"
] as const;