import React, { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface TacticalIntelGraphsProps {
    teamId?: number | null;
    availableTeams: { id: number; name: string; game: string }[];
}

interface PlayerStat {
    name: string;
    kd: string | number;
    avgAcs: number;
    games: number;
}

const GOLD = '#fbbf24';
const PURPLE = '#8b5cf6';
const EMERALD = '#10b981';
const RED = '#ef4444';
const SLATE = '#334155';
const DARK = '#020617';

// SVG Donut Ring
const DonutRing: React.FC<{ wins: number; losses: number; label?: string }> = ({ wins, losses, label }) => {
    const total = wins + losses || 1;
    const winPct = Math.round((wins / total) * 100);
    const r = 52;
    const circ = 2 * Math.PI * r;
    const winArc = (wins / total) * circ;
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 md:w-36 md:h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r={r} fill="none" stroke="#ffffff08" strokeWidth="12" />
                    <circle
                        cx="60" cy="60" r={r} fill="none"
                        stroke="url(#donutWin)" strokeWidth="12"
                        strokeDasharray={`${winArc} ${circ - winArc}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                    <circle
                        cx="60" cy="60" r={r} fill="none"
                        stroke={RED + '66'} strokeWidth="12"
                        strokeDasharray={`${circ - winArc} ${winArc}`}
                        strokeDashoffset={-winArc}
                        strokeLinecap="round"
                    />
                    <defs>
                        <linearGradient id="donutWin" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={GOLD} />
                            <stop offset="100%" stopColor={EMERALD} />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl md:text-2xl font-black text-white tracking-tighter">{winPct}%</span>
                    <span className="text-[7px] md:text-[9px] font-black text-amber-500/60 uppercase tracking-[0.2em]">WINS</span>
                </div>
            </div>
            {label && <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-2">{label}</p>}
            <div className="flex gap-4 mt-3">
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{wins}W
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{losses}L
                </span>
            </div>
        </div>
    );
};

// Recent Form Strip
const FormStrip: React.FC<{ form: string[] }> = ({ form }) => (
    <div className="flex flex-col items-start">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Recent Form</p>
        <div className="flex gap-2 flex-wrap">
            {form.length === 0
                ? <span className="text-[10px] text-slate-600 font-bold">No completed matches yet</span>
                : form.slice(-7).map((r, i) => (
                    <span key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all ${r === 'W'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>{r}</span>
                ))
            }
        </div>
    </div>
);

// Status Pill Row
const StatusPills: React.FC<{ pending: number; completed: number; cancelled: number }> = ({ pending, completed, cancelled }) => (
    <div className="flex flex-col">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Condition</p>
        <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                {pending} Pending
            </span>
            <span className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                {completed} Done
            </span>
            <span className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider">
                {cancelled} Cancelled
            </span>
        </div>
    </div>
);

// Section header
const SectionLabel: React.FC<{ label: string; color?: string }> = ({ label, color = 'text-amber-500/60' }) => (
    <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-4 ${color}`}>{label}</p>
);

// Custom recharts tooltip
const RoyalTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#020617] border border-amber-500/20 rounded-2xl px-5 py-3 shadow-2xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/60 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-sm font-black" style={{ color: p.color }}>{p.value}</p>
            ))}
        </div>
    );
};

// ─── PLAYER STATS TABLE ───────────────────────────────────────────────────────
const PlayerStatsTable: React.FC<{ stats: PlayerStat[], title: string }> = ({ stats, title }) => (
    <div className="bg-white/[0.02] rounded-[24px] md:rounded-[32px] border border-white/5 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-white/5">
            <SectionLabel label={title} />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px] md:min-w-full">
                <thead>
                    <tr className="bg-white/[0.01]">
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Operative</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Combat K/D</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Average ACS</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Ops Logged</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {stats.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-8 py-10 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">No intelligence gathered for this unit</td>
                        </tr>
                    ) : (
                        stats.map((p, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] font-black border border-amber-500/20">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">{p.name}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`text-sm font-black tracking-tighter ${Number(p.kd) >= 1.5 ? 'text-emerald-400' : Number(p.kd) >= 1.0 ? 'text-white' : 'text-red-400'}`}>
                                        {p.kd}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className="text-sm font-black text-amber-400 tracking-tighter">{p.avgAcs}</span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className="text-xs font-black text-slate-500 tracking-widest">{p.games}</span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── SCRIM TAB ───────────────────────────────────────────────────────────────
const ScrimIntel: React.FC<{ scrims: any[], playerStats: PlayerStat[] }> = ({ scrims, playerStats }) => {
    const completed = scrims.filter(s => s.status === 'completed');
    const pending = scrims.filter(s => s.status === 'pending').length;
    const cancelled = scrims.filter(s => s.status === 'cancelled').length;

    // Win/Loss from results JSON: a scrim is a W if majority maps are WIN
    let wins = 0, losses = 0;
    const recentForm: string[] = [];
    const mapWins: Record<string, { w: number; t: number }> = {};

    completed.forEach(s => {
        let results: any[] = [];
        try { results = JSON.parse(s.results || '[]'); } catch { }
        const ws = results.filter((r: any) => r.score === 'WIN').length;
        const ls = results.filter((r: any) => r.score === 'LOSS').length;
        const isWin = ws > ls;
        if (isWin) wins++; else losses++;
        recentForm.push(isWin ? 'W' : 'L');

        // Map stats
        let maps: string[] = [];
        try { maps = JSON.parse(s.maps || '[]'); } catch { }
        maps.forEach((m: string, i: number) => {
            if (!mapWins[m]) mapWins[m] = { w: 0, t: 0 };
            mapWins[m].t++;
            if (results[i]?.score === 'WIN') mapWins[m].w++;
        });
    });

    const mapData = Object.entries(mapWins).map(([name, v]) => ({
        name,
        winRate: Math.round((v.w / v.t) * 100),
    })).sort((a, b) => b.winRate - a.winRate);

    if (scrims.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">No Scrims Logged</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Top row: donut + form + status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-white/[0.02] rounded-[24px] md:rounded-[32px] border border-white/5 p-6 md:p-8 flex flex-col items-center justify-center">
                    <SectionLabel label="Combat Record" />
                    <DonutRing wins={wins} losses={losses} label="Win Rate" />
                </div>
                <div className="bg-white/[0.02] rounded-[24px] md:rounded-[32px] border border-white/5 p-6 md:p-8 flex flex-col gap-6 md:gap-8 justify-center">
                    <FormStrip form={recentForm} />
                    <StatusPills pending={pending} completed={completed.length} cancelled={cancelled} />
                </div>
                <div className="bg-white/[0.02] rounded-[24px] md:rounded-[32px] border border-white/5 p-6 md:p-8 flex flex-col justify-center">
                    <SectionLabel label="Totals" />
                    <div className="space-y-3 md:space-y-4">
                        {[
                            { label: 'Total', value: scrims.length, color: 'text-white' },
                            { label: 'Done', value: completed.length, color: 'text-emerald-400' },
                            { label: 'Wins', value: wins, color: 'text-amber-400' },
                            { label: 'Losses', value: losses, color: 'text-red-400' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex justify-between items-center border-b border-white/5 pb-2 md:pb-3 last:border-0 last:pb-0">
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                                <span className={`text-base md:text-xl font-black tracking-tighter ${color}`}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Map Win Rate Bars */}
            {mapData.length > 0 && (
                <div className="bg-white/[0.02] rounded-[32px] border border-white/5 p-8">
                    <SectionLabel label="Theater Win Rate (%)" />
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mapData} barSize={28}>
                                <defs>
                                    <linearGradient id="scrimMapGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={GOLD} stopOpacity={1} />
                                        <stop offset="100%" stopColor={PURPLE} stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="8 8" stroke="#ffffff06" vertical={false} />
                                <XAxis dataKey="name" stroke={GOLD + '66'} fontSize={10} fontWeight="900" tickLine={false} axisLine={false} dy={8} />
                                <YAxis domain={[0, 100]} stroke={GOLD + '44'} fontSize={9} fontWeight="900" tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                                <Tooltip content={<RoyalTooltip />} />
                                <Bar dataKey="winRate" radius={[8, 8, 0, 0]} fill="url(#scrimMapGrad)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <PlayerStatsTable stats={playerStats} title="Scrim Performance Metrics" />
        </div>
    );
};

// ─── TOURNAMENT TAB ───────────────────────────────────────────────────────────
const TournamentIntel: React.FC<{ tournaments: any[], playerStats: PlayerStat[] }> = ({ tournaments, playerStats }) => {
    const completed = tournaments.filter(t => t.status === 'completed');
    const pending = tournaments.filter(t => t.status === 'pending').length;
    const cancelled = tournaments.filter(t => t.status === 'cancelled').length;

    let wins = 0, losses = 0;
    const recentForm: string[] = [];
    const opponentCount: Record<string, number> = {};
    const formatCount: Record<string, number> = {};

    completed.forEach(t => {
        let results: any[] = [];
        try { results = JSON.parse(t.results || '[]'); } catch { }
        const ws = results.filter((r: any) => r.score === 'WIN').length;
        const ls = results.filter((r: any) => r.score === 'LOSS').length;
        const isWin = ws > ls;
        if (isWin) wins++; else losses++;
        recentForm.push(isWin ? 'W' : 'L');
    });

    tournaments.forEach(t => {
        if (t.opponent) opponentCount[t.opponent] = (opponentCount[t.opponent] || 0) + 1;
        if (t.format) formatCount[t.format] = (formatCount[t.format] || 0) + 1;
    });

    const opponentData = Object.entries(opponentCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    const formatData = Object.entries(formatCount).map(([name, value]) => ({ name, value }));
    const FORMAT_COLORS = [GOLD, PURPLE, EMERALD, '#60a5fa', '#f472b6'];

    if (tournaments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">No Tournament Data</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Top row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/[0.02] rounded-[32px] border border-white/5 p-8 flex flex-col items-center justify-center">
                    <SectionLabel label="Tournament Record" />
                    <DonutRing wins={wins} losses={losses} label="Tournament Win Rate" />
                </div>
                <div className="bg-white/[0.02] rounded-[32px] border border-white/5 p-8 flex flex-col gap-8 justify-center">
                    <FormStrip form={recentForm} />
                    <StatusPills pending={pending} completed={completed.length} cancelled={cancelled} />
                </div>
                <div className="bg-white/[0.02] rounded-[32px] border border-white/5 p-8 flex flex-col justify-center">
                    <SectionLabel label="Format Breakdown" />
                    {formatData.length > 0 ? (
                        <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={formatData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                        innerRadius={35} outerRadius={58} paddingAngle={4}>
                                        {formatData.map((_, i) => (
                                            <Cell key={i} fill={FORMAT_COLORS[i % FORMAT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<RoyalTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-600 font-bold">No format data</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {formatData.map((f, i) => (
                            <span key={f.name} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                <span className="w-2 h-2 rounded-full" style={{ background: FORMAT_COLORS[i % FORMAT_COLORS.length] }} />
                                {f.name} ({f.value})
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Opponent Frequency */}
            {opponentData.length > 0 && (
                <div className="bg-white/[0.02] rounded-[32px] border border-white/5 p-8">
                    <SectionLabel label="Opponent Frequency" color="text-purple-400/60" />
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={opponentData} barSize={28}>
                                <defs>
                                    <linearGradient id="tourneyBarGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={PURPLE} stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4c1d95" stopOpacity={0.7} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="8 8" stroke="#ffffff06" vertical={false} />
                                <XAxis dataKey="name" stroke={PURPLE + '99'} fontSize={9} fontWeight="900" tickLine={false} axisLine={false} dy={8} />
                                <YAxis stroke={PURPLE + '66'} fontSize={9} fontWeight="900" tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip content={<RoyalTooltip />} />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="url(#tourneyBarGrad)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <PlayerStatsTable stats={playerStats} title="Tournament Performance Metrics" />
        </div>
    );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const TacticalIntelGraphs: React.FC<TacticalIntelGraphsProps> = ({ teamId: initialTeamId, availableTeams }) => {
    const [activeTab, setActiveTab] = useState<'scrim' | 'tournament'>('scrim');
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(initialTeamId ?? (availableTeams[0]?.id || null));
    const [scrims, setScrims] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [scrimStats, setScrimStats] = useState<PlayerStat[]>([]);
    const [tourneyStats, setTourneyStats] = useState<PlayerStat[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const selectedTeam = availableTeams.find(t => t.id === selectedTeamId) || availableTeams[0];

    const API = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (availableTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(availableTeams[0].id);
        }
    }, [availableTeams]);

    useEffect(() => {
        if (!selectedTeamId) return;
        setLoading(true);
        Promise.all([
            fetch(`${API}/api/scrims?teamId=${selectedTeamId}`).then(r => r.ok ? r.json() : { success: false, data: [] }),
            fetch(`${API}/api/tournaments?teamId=${selectedTeamId}`).then(r => r.ok ? r.json() : { success: false, data: [] }),
            fetch(`${API}/api/teams/${selectedTeamId}/stats`).then(r => r.ok ? r.json() : { success: false, data: null }),
        ]).then(([sRes, tRes, stRes]) => {
            setScrims(sRes.success && Array.isArray(sRes.data) ? sRes.data : []);
            setTournaments(tRes.success && Array.isArray(tRes.data) ? tRes.data : []);
            if (stRes.success && stRes.data) {
                const st = stRes.data;
                if (st.scrim) setScrimStats(st.scrim.topPlayers || []);
                if (st.tournament) setTourneyStats(st.tournament.topPlayers || []);
            }
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedTeamId]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Tactical Intelligence</h3>
                    </div>
                    <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.4em] ml-5">Real-Time Combat Analytics</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                    {/* Tab Toggle */}
                    <div className="bg-black/40 rounded-2xl p-1.5 border border-white/5 flex">
                        {[
                            { id: 'scrim', label: 'Scrim Intel' },
                            { id: 'tournament', label: 'Tournament Intel' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === tab.id
                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >{tab.label}</button>
                        ))}
                    </div>
                    {/* Team Selector */}
                    {availableTeams.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="bg-black/40 border border-white/10 rounded-2xl px-6 py-2.5 text-[10px] font-black text-amber-400 uppercase tracking-widest focus:outline-none focus:border-amber-500/50 flex items-center gap-3 hover:bg-black/60 transition-all"
                            >
                                {selectedTeam?.name} // {selectedTeam?.game.toUpperCase()}
                                <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-[60]" onClick={() => setIsDropdownOpen(false)} />
                                    <div className="absolute top-full mt-2 right-0 w-64 bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {availableTeams.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setSelectedTeamId(t.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full px-6 py-3 text-[10px] font-black text-left uppercase tracking-widest transition-all hover:bg-white/5 border-b border-white/5 last:border-0 ${selectedTeamId === t.id ? 'text-amber-500 bg-amber-500/5' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                {t.name}
                                                <span className="block text-[8px] text-slate-600 mt-0.5">{t.game.toUpperCase()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 w-12 h-12 border-4 border-purple-500/10 border-b-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 animate-pulse">Compiling Intelligence...</p>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {activeTab === 'scrim' ? (
                        <ScrimIntel scrims={scrims} playerStats={scrimStats} />
                    ) : (
                        <TournamentIntel tournaments={tournaments} playerStats={tourneyStats} />
                    )}
                </div>
            )}
        </div>
    );
};

export default TacticalIntelGraphs;
