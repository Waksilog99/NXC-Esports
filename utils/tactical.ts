export const calculateKDA = (kills: number, assists: number, deaths: number): string => {
    return ((kills + (assists || 0)) / (deaths || 1)).toFixed(2);
};

export const getKDAColor = (kda: string | number): string => {
    const val = typeof kda === 'string' ? parseFloat(kda) : kda;
    if (val >= 1.5) return 'text-emerald-500';
    if (val >= 1.2) return 'text-emerald-400';
    if (val >= 1.0) return 'text-white';
    return 'text-red-400';
};

export const getAgentImage = (agentName: string): string => {
    const normalized = (agentName || 'Unknown').replace('/', '_');
    // Veto specifically might use .webp or .png, fallback logic handled in component usually
    // but we can provide the base path here
    if (normalized === 'Veto') return `/assets/agents/${normalized}.webp`;
    return `/assets/agents/${normalized}.png`;
};

export const getTacticalRole = (roleStr: string): string => {
    if (!roleStr) return 'Operative';
    const roles = roleStr.split(',').map(r => r.trim());
    const tacticalRoles = ['Sentinel', 'Duelist', 'Initiator', 'Controller', 'Entry', 'Support', 'Sniper', 'IGL', 'Lurker', 'Rifler', 'Fragger', 'Lead', 'Scout', 'Anchor', 'Jungler', 'Roamer', 'Mid Lane', 'Gold Lane', 'EXP Lane', 'Tank', 'Carry', 'ADC'];
    const found = roles.find(r => tacticalRoles.some(tr => tr.toLowerCase() === r.toLowerCase()));
    return found || roles[0] || 'Operative';
};
