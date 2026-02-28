import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateKDA, getKDAColor, getTacticalRole } from '../utils/tactical';
import { GET_API_BASE_URL } from '../utils/apiUtils';

export interface PlayerStats {
    id: number;
    name: string;
    role: string;
    kda?: string;
    winRate?: string;
    acs?: string;
    image: string;
    level?: number;
    xp?: number;
    userId?: number;
}

const AnimatedTitle = ({ text1, text2, className }: { text1: string, text2: string, className: string }) => {
    return (
        <h2 className={className}>
            <span className="text-white inline-block">
                {text1.split('').map((char, i) => (char === ' ' ? <span key={i}>&nbsp;</span> : <span key={i} className="animate-letter" style={{ animationDelay: `${i * 0.05}s` }}>{char}</span>))}
            </span>
            <span className="inline-block">&nbsp;</span>
            <span className="text-amber-500 inline-block">
                {text2.split('').map((char, i) => (char === ' ' ? <span key={i}>&nbsp;</span> : <span key={i} className="animate-letter" style={{ animationDelay: `${(text1.length + i) * 0.05}s` }}>{char}</span>))}
            </span>
        </h2>
    );
};

const PlayerStatsModal = ({ player, isOpen, onClose, userRole, currentUserId, trendData = [], showAdvancedIntel = false }: { player: PlayerStats | null; isOpen: boolean; onClose: () => void; userRole?: string; currentUserId?: number; trendData?: any[]; showAdvancedIntel?: boolean }) => {
    const [breakdown, setBreakdown] = useState<any>(null);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);
    const [breakdownError, setBreakdownError] = useState<string | null>(null);
    const [detailView, setDetailView] = useState<{ type: 'agent' | 'role' | 'map', name: string } | null>(null);
    const [matchIntelDetail, setMatchIntelDetail] = useState<any>(null);
    const [loadingMatchIntel, setLoadingMatchIntel] = useState(false);
    const [selectedMatchForStats, setSelectedMatchForStats] = useState<{ id: number; type: 'scrim' | 'tournament'; opponent: string; date: string } | null>(null);
    const [matchDetails, setMatchDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const isAuthorized = (role?: string) => {
        if (showAdvancedIntel) return true; // If view explicitly requests advanced intel, allow it
        if (!role) return false;
        if (player && currentUserId === player.userId) return true;
        const roles = role.split(',').map(r => r.trim().toLowerCase());
        return roles.some(r => ['manager', 'coach', 'admin', 'ceo'].includes(r));
    };

    const fetchBreakdown = async () => {
        if (player && isOpen && userRole && showAdvancedIntel && isAuthorized(userRole)) {
            setLoadingBreakdown(true);
            setBreakdownError(null);
            try {
                const res = await fetch(`${GET_API_BASE_URL()}/api/players/${player.id}/stats/breakdown`);
                if (!res.ok) throw new Error('Tactical Neural Link Failure: Terminal Unresponsive');
                const result = await res.json();
                if (result.success) {
                    setBreakdown(result.data);
                } else {
                    throw new Error(result.error || 'Intelligence Stream Corrupted');
                }
            } catch (err: any) {
                console.error("Error fetching breakdown", err);
                setBreakdownError(err.message);
            } finally {
                setLoadingBreakdown(false);
            }
        } else {
            setBreakdown(null);
            setDetailView(null);
            setBreakdownError(null);
        }
    };

    useEffect(() => {
        fetchBreakdown();

        const handleRefresh = () => {
            console.log("[PLAYER-STATS-MODAL] Real-time sync triggered");
            fetchBreakdown();
        };

        window.addEventListener('nxc-db-refresh', handleRefresh);
        return () => window.removeEventListener('nxc-db-refresh', handleRefresh);
    }, [player, isOpen, userRole, showAdvancedIntel]);

    const getDetailData = () => {
        if (!detailView || !breakdown?.history) return [];
        const history = breakdown.history;

        if (detailView.type === 'agent') {
            return history
                .filter((s: any) => s.agent === detailView.name)
                .map((s: any) => ({
                    date: s.date,
                    kd: calculateKDA(s.kills, s.assists, s.deaths)
                }))
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        if (detailView.type === 'role') {
            return history
                .filter((s: any) => s.role === detailView.name)
                .map((s: any) => ({
                    date: s.date,
                    kd: calculateKDA(s.kills, s.assists, s.deaths)
                }))
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        if (detailView.type === 'map') {
            return history
                .filter((s: any) => s.map === detailView.name)
                .map((s: any) => ({
                    date: s.date,
                    kd: calculateKDA(s.kills, s.assists, s.deaths)
                }))
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        return [];
    };

    const getAgentsInRole = () => {
        if (!detailView || detailView.type !== 'role' || !breakdown?.history) return [];
        const agents = new Set<string>();
        breakdown.history.forEach((s: any) => {
            if (s.role === detailView.name) agents.add(s.agent);
        });
        return Array.from(agents);
    };

    const handleMatchClick = async (s: any) => {
        const matchId = s.scrimId || s.tournamentId;
        const type = s.scrimId ? 'scrims' : 'tournaments';
        if (!matchId) return;

        setLoadingMatchIntel(true);
        try {
            const res = await fetch(`${GET_API_BASE_URL()}/api/${type}/${matchId}/stats`);
            const result = await res.json();
            if (result.success) {
                setMatchIntelDetail({
                    ...s,
                    details: result.data
                });
            }
        } catch (err) {
            console.error("Match intel fetch error:", err);
        } finally {
            setLoadingMatchIntel(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} zIndex={1000} backdropClassName="bg-black/90 backdrop-blur-xl" className="w-full max-w-4xl p-4 md:p-6">
                {player && <div className="relative w-full bg-[#020617]/90 backdrop-blur-3xl rounded-[40px] md:rounded-[56px] border border-amber-500/30 shadow-[0_0_120px_rgba(245,158,11,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

                    {/* Header / Image Background */}
                    <div className="relative h-[340px] md:h-[440px] overflow-hidden border-b border-white/5 bg-[#020617]">
                        {/* Detail View Modal */}
                        <Modal
                            isOpen={!!detailView}
                            onClose={() => setDetailView(null)}
                            zIndex={1100}
                            backdropClassName="bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500"
                            className="w-full max-w-4xl p-4 md:p-6"
                        >
                            {detailView && (
                                <div className="relative w-full bg-[#020617]/95 backdrop-blur-3xl rounded-[40px] md:rounded-[56px] border border-amber-500/30 shadow-[0_0_150px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col p-8 md:p-12 animate-in zoom-in-95 duration-500 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/[0.05] blur-[150px] rounded-full pointer-events-none" />
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
                                        <button
                                            onClick={() => setDetailView(null)}
                                            className="w-fit px-6 py-3.5 bg-white/5 hover:bg-amber-500 text-slate-400 hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all border border-white/5 hover:border-amber-500 active:scale-95 shadow-2xl group/back"
                                        >
                                            <svg className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                                            Retract Intel
                                        </button>
                                        <div className="text-left md:text-right space-y-1">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em]">{detailView.type} Operational Archives</p>
                                            <div className="flex items-center md:justify-end gap-4">
                                                {detailView.type === 'agent' && (
                                                    <img
                                                        src={`/assets/agents/${detailView.name.replace('/', '_')}${detailView.name === 'Veto' ? '.webp' : '.png'}`}
                                                        alt={detailView.name}
                                                        className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                )}
                                                <h4 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">{detailView.name}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-grow space-y-8 relative z-10">
                                        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 md:p-10">
                                            <div className="flex items-center space-x-4 text-amber-500 mb-8">
                                                <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse" />
                                                <h4 className="text-xs md:text-sm font-black uppercase tracking-[0.4em] italic">Historical Performance Trajectory</h4>
                                            </div>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={getDetailData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorKdDetail" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(str) => {
                                                            const d = new Date(str);
                                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                                        }} />
                                                        <YAxis stroke="#475569" fontSize={10} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#020617', borderColor: '#fbbf2433', borderRadius: '16px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                            itemStyle={{ color: '#fbbf24' }}
                                                            labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                                            labelFormatter={(label) => `Timestamp: ${label}`}
                                                            formatter={(value, name) => [value, 'KDA Ratio']}
                                                        />
                                                        <Area type="monotone" dataKey="kd" stroke="#fbbf24" strokeWidth={4} fillOpacity={1} fill="url(#colorKdDetail)" activeDot={{ r: 8, strokeWidth: 0, fill: '#fbbf24' }} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {detailView.type === 'role' && (
                                            <div className="space-y-4 pt-4">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] pl-4">Combat Ready Operatives</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {getAgentsInRole().map((agent, idx) => (
                                                        <span key={idx} className="px-5 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black text-amber-500/80 uppercase tracking-widest italic group hover:bg-amber-500/10 hover:border-amber-500/30 transition-all">{agent}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Match History Details */}
                                        <div className="space-y-6 pt-8">
                                            <div className="flex items-center space-x-4 text-amber-500">
                                                <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
                                                <h4 className="text-xs md:text-sm font-black uppercase tracking-[0.4em] italic">Match Intelligence History</h4>
                                            </div>

                                            <div className="p-4 sm:p-10 space-y-12 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
                                                {breakdown?.history
                                                    .filter((s: any) => {
                                                        if (detailView.type === 'agent') return s.agent === detailView.name;
                                                        if (detailView.type === 'role') return s.role === detailView.name;
                                                        if (detailView.type === 'map') return s.map === detailView.name;
                                                        return false;
                                                    })
                                                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                    .map((s: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleMatchClick(s)}
                                                            className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white/[0.05] hover:border-amber-500/30 transition-all cursor-pointer relative overflow-hidden"
                                                        >
                                                            {loadingMatchIntel && (
                                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                                                                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${s.isWin === 1 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                                    {s.isWin === 1 ? 'WIN' : 'LOSS'}
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src={`/assets/agents/${(s.agent || '').replace('/', '_')}${s.agent === 'Veto' ? '.webp' : '.png'}`}
                                                                        className="w-8 h-8 object-contain drop-shadow-[0_0_5px_rgba(245,158,11,0.3)] transition-transform group-hover:scale-110"
                                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                    />
                                                                    <div>
                                                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                                        <p className="text-sm font-black text-white uppercase tracking-tighter italic group-hover:text-amber-500 transition-colors">vs {s.opponent || 'Unknown Opponent'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-6 md:gap-8">
                                                                <div className="text-center">
                                                                    <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Map</p>
                                                                    <p className="text-[10px] font-black text-white uppercase">{s.map}</p>
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">KDA</p>
                                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{s.kills}/{s.deaths}/{s.assists}</p>
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">KDA Ratio</p>
                                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${getKDAColor(calculateKDA(s.kills, s.assists, s.deaths))}`}>
                                                                        {calculateKDA(s.kills, s.assists, s.deaths)}
                                                                    </p>
                                                                </div>

                                                                <div className="text-center">
                                                                    <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">ACS</p>
                                                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">{s.acs || 0}</p>
                                                                </div>
                                                                <div className="text-slate-600 group-hover:text-amber-500 transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Modal>

                        {/* Match Detail Modal */}
                        <Modal
                            isOpen={!!matchIntelDetail}
                            onClose={() => setMatchIntelDetail(null)}
                            zIndex={1200}
                            backdropClassName="bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500"
                            className="w-full max-w-2xl p-4 md:p-6"
                        >
                            {matchIntelDetail && (
                                <div className="relative w-full bg-[#020617]/95 backdrop-blur-3xl rounded-[40px] border border-amber-500/30 shadow-2xl overflow-hidden p-8 md:p-10 animate-in zoom-in-95 duration-500 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Tactical Match Report</p>
                                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">vs {matchIntelDetail.opponent}</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(matchIntelDetail.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${matchIntelDetail.isWin === 1 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                            {matchIntelDetail.isWin === 1 ? 'VICTORY' : 'DEFEAT'}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Deployment Area</p>
                                                <p className="text-sm font-black text-white uppercase italic">{matchIntelDetail.map}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Personnel Role</p>
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={`/assets/agents/${(matchIntelDetail.agent || '').replace('/', '_')}${matchIntelDetail.agent === 'Veto' ? '.webp' : '.png'}`}
                                                        className="w-5 h-5 object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                    <p className="text-sm font-black text-white uppercase italic">{matchIntelDetail.agent} ({matchIntelDetail.role})</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden">
                                            <div className="p-5 border-b border-white/5">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Team Performance Registry</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-white/[0.01]">
                                                            <th className="px-6 py-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">Operator</th>
                                                            <th className="px-6 py-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">K/D/A</th>
                                                            <th className="px-6 py-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">KDA Ratio</th>
                                                            <th className="px-6 py-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">ACS</th>

                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {(matchIntelDetail.details?.stats || []).map((st: any, i: number) => (
                                                            <tr key={i} className={st.playerId === player.id ? 'bg-amber-500/5' : ''}>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <img
                                                                            src={`/assets/agents/${(st.agent || '').replace('/', '_')}${st.agent === 'Veto' ? '.webp' : '.png'}`}
                                                                            className="w-6 h-6 object-contain"
                                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                        />
                                                                        <span className="text-xs font-black text-white uppercase">{st.playerName || st.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className="text-xs font-black text-slate-400">{st.kills}/{st.deaths}/{st.assists}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`text-xs font-black ${getKDAColor(calculateKDA(st.kills, st.assists, st.deaths))}`}>{calculateKDA(st.kills, st.assists, st.deaths)}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className="text-xs font-black text-purple-400">{st.acs}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setMatchIntelDetail(null)}
                                        className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5"
                                    >
                                        Dismiss Report
                                    </button>
                                </div>
                            )}
                        </Modal>

                        {/* Header / Image Background */}
                        <div className="relative h-[340px] md:h-[440px] overflow-hidden border-b border-white/5 bg-[#020617]">
                            <div className="space-y-2 text-center pointer-events-none">
                                <AnimatedTitle
                                    text1="Hall of"
                                    text2="Excellence"
                                    className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[0.8]"
                                />
                                <div className="flex items-center justify-center w-full mt-2">
                                    <div className="h-[1px] w-12 md:w-24 bg-amber-500/30"></div>
                                    <p className="px-4 text-[7px] md:text-[9px] text-slate-500 font-black uppercase tracking-[0.5em] whitespace-nowrap">The Apex of Performance</p>
                                    <div className="h-[1px] w-12 md:w-24 bg-amber-500/30"></div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <span className="px-6 md:px-8 py-1.5 md:py-2 bg-amber-500 text-black text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_10px_20px_rgba(245,158,11,0.2)]">
                                    Operative Profile
                                </span>
                            </div>

                            <div className="flex flex-col items-center space-y-4 pt-2 relative z-20">
                                <div className="relative group">
                                    <div className="absolute -inset-2 bg-amber-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                    <img
                                        src={player.image}
                                        alt={player.name}
                                        className="w-20 h-20 md:w-24 md:h-24 rounded-3xl border-2 border-amber-500/20 shadow-2xl object-cover bg-slate-800 relative z-10"
                                    />
                                </div>
                                <div className="text-center space-y-1 md:space-y-2 pb-2">
                                    <div className="flex items-center justify-center space-x-3 text-amber-500">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_15px_#fbbf24]" />
                                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em]">{getTacticalRole(player.role)}</span>
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{player.name}</h3>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 w-12 h-12 rounded-[18px] bg-[#020617]/60 backdrop-blur-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500 hover:scale-110 active:scale-90 transition-all border border-white/10 z-[60] shadow-2xl group/close"
                        >
                            <svg className="w-6 h-6 transform group-hover/close:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* content */}
                    <div className="p-8 md:p-12 space-y-10 md:space-y-16 max-h-[55vh] overflow-y-auto custom-scrollbar relative z-10">

                        {/* Basic Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 text-center group hover:border-amber-500/30 transition-all">
                                <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2">KDA Ratio</p>
                                <p className="text-2xl md:text-3xl font-black text-white tracking-tighter group-hover:text-amber-400 transition-colors">{player.kda || '0.0'}</p>
                                <p className="text-[7px] md:text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Lethality Index</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 text-center group hover:border-purple-500/30 transition-all">
                                <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2">ACS</p>
                                <p className="text-2xl md:text-3xl font-black text-white tracking-tighter group-hover:text-purple-400 transition-colors">{player.acs || '0'}</p>
                                <p className="text-[7px] md:text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Combat Score</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-white/5 text-center group hover:border-emerald-500/30 transition-all">
                                <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2">Win Rate</p>
                                <p className="text-2xl md:text-3xl font-black text-white tracking-tighter group-hover:text-emerald-400 transition-colors">{player.winRate || '0%'}</p>
                                <p className="text-[7px] md:text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Victory Vector</p>
                            </div>
                        </div>

                        {/* Performance Analysis summary string */}
                        {(player.winRate && player.winRate !== '0%') && (
                            <div className="p-5 md:p-6 bg-amber-500/5 rounded-2xl md:rounded-3xl border border-amber-500/10">
                                <div className="flex items-start space-x-4">
                                    <div className="p-2.5 md:p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] md:text-sm font-black text-amber-500 uppercase tracking-widest mb-1">Performance Analysis</h4>
                                        <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-relaxed">
                                            Operative <span className="text-white font-bold">{player.name}</span> is performing at optimal efficiency.
                                            Combat metrics indicate strong <span className="text-white">{player.role}</span> capabilities with a {player.winRate} mission success rate.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chart Container */}
                        {showAdvancedIntel && (breakdown?.trendData?.length > 0 || trendData.length > 0) && (
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center space-x-3 text-purple-500 mb-6">
                                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7] animate-pulse" />
                                    <h4 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em]">Tactical Metric Trends</h4>
                                </div>
                                <div className="h-[250px] min-h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={breakdown?.trendData || trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorAcs" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#334155" fontSize={10} tickFormatter={(str) => {
                                                const d = new Date(str);
                                                return `${d.getMonth() + 1}/${d.getDate()}`;
                                            }} />
                                            <YAxis stroke="#334155" fontSize={10} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                                itemStyle={{ color: '#fbbf24' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                                formatter={(value, name) => [value, 'ACS']}
                                            />
                                            <Area type="monotone" dataKey="acs" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcs)" activeDot={{ r: 6, strokeWidth: 0, fill: '#fbbf24' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Advanced Breakdown for Managers/Coaches */}
                        {showAdvancedIntel && userRole && isAuthorized(userRole) && breakdown && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 cursor-default">
                                <div className="h-px w-full bg-white/5" />

                                <div className="flex items-center space-x-3 text-amber-500 mb-4">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_10px_#fbbf24] animate-pulse" />
                                    <h4 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em]">Tactical Breakdown</h4>
                                </div>

                                {/* Agent Stats */}
                                {breakdown.agentStats && breakdown.agentStats.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-2">Operator Affinities</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {breakdown.agentStats.map((s: any, i: number) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setDetailView({ type: 'agent', name: s.name })}
                                                    className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer relative overflow-hidden"
                                                >
                                                    <div className="absolute -right-2 -bottom-2 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <img
                                                            src={`/assets/agents/${(s.name || '').replace('/', '_')}${s.name === 'Veto' ? '.webp' : '.png'}`}
                                                            className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 relative z-10">
                                                        <img
                                                            src={`/assets/agents/${(s.name || '').replace('/', '_')}${s.name === 'Veto' ? '.webp' : '.png'}`}
                                                            className="w-6 h-6 object-contain drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                        <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400 group-hover:text-indigo-300 truncate">{s.name}</div>
                                                    </div>
                                                    <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2 relative z-10">
                                                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-400"><span>Games</span> <span className="text-white font-black">{s.games}</span></div>
                                                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-400"><span>Win %</span> <span className={`${s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} font-black`}>{s.winRate}%</span></div>
                                                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-400"><span>KDA</span> <span className="text-white font-black">{s.kd}</span></div>
                                                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-400"><span>ACS</span> <span className="text-purple-400 font-black">{s.acs || 0}</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Role Stats */}
                                {breakdown.roleStats && breakdown.roleStats.length > 0 && (
                                    <div className="space-y-3 pt-4">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-2">Class Proficiency</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {breakdown.roleStats.map((s: any, i: number) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setDetailView({ type: 'role', name: s.name })}
                                                    className="bg-white/5 border border-fuchsia-500/10 rounded-2xl p-4 flex flex-col justify-between group hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 transition-all cursor-pointer relative overflow-hidden"
                                                >
                                                    <div className="absolute -right-2 -bottom-2 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <img
                                                            src={`/assets/roles/${s.name}.png`}
                                                            className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 relative z-10">
                                                        <img
                                                            src={`/assets/roles/${s.name}.png`}
                                                            className="w-6 h-6 object-contain drop-shadow-[0_0_5px_rgba(217,70,239,0.3)]"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                        <div className="text-[10px] uppercase font-black tracking-widest text-fuchsia-400 group-hover:text-fuchsia-300">{s.name}</div>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 relative z-10">
                                                        <div className="flex flex-col">
                                                            <span className={`${s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} font-black`}>{s.winRate}% WR</span>
                                                            <span className="text-[7px] text-purple-400">{s.acs || 0} Avg ACS</span>
                                                        </div>
                                                        <span className="px-2.5 py-1 bg-white/5 rounded-lg text-white font-black">{s.games} Played</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Map Stats */}
                                {breakdown.mapStats && breakdown.mapStats.length > 0 && (
                                    <div className="space-y-3 pt-4">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-2">Environment Performance</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {breakdown.mapStats.map((s: any, i: number) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setDetailView({ type: 'map', name: s.name })}
                                                    className="bg-white/5 border border-amber-500/10 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/30 hover:bg-amber-500/5 transition-all cursor-pointer"
                                                >
                                                    <div className="text-[10px] md:text-xs uppercase font-black tracking-tight text-amber-500/80 mb-2 truncate group-hover:text-amber-400 relative z-10">{s.name}</div>
                                                    <div className="flex items-center space-x-2 relative z-10">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${s.winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                        <span className="text-[9px] text-white font-black">{s.winRate}%</span>
                                                        <span className="text-[9px] text-slate-500 font-black px-1">• {s.games} Games</span>
                                                        <span className="text-[9px] text-purple-400 font-black px-1">• {s.acs || 0} ACS</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Match History Section */}
                                {breakdown.history && breakdown.history.length > 0 && (
                                    <div className="space-y-6 pt-8 border-t border-white/5">
                                        <div className="flex items-center space-x-3 text-emerald-500 mb-4">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] animate-pulse" />
                                            <h4 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em]">Tactical Engagement Log</h4>
                                        </div>
                                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                            {[...breakdown.history].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((m: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (m.matchId && m.type) {
                                                            setSelectedMatchForStats({ id: m.matchId, type: m.type, opponent: m.opponent, date: m.date });
                                                            setLoadingDetails(true);
                                                            const endpoint = m.type === 'scrim' ? `scrims/${m.matchId}/stats` : `tournaments/${m.matchId}/stats`;
                                                            fetch(`${GET_API_BASE_URL()}/api/${endpoint}`)
                                                                .then(res => res.json())
                                                                .then(result => {
                                                                    if (result.success) setMatchDetails(Array.isArray(result.data) ? result.data : result.data.stats || []);
                                                                })
                                                                .catch(console.error)
                                                                .finally(() => setLoadingDetails(false));
                                                        }
                                                    }}
                                                    className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.05] transition-all cursor-pointer active:scale-[0.98]"
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${m.isWin === 1 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {m.isWin === 1 ? 'W' : 'L'}
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{m.opponent || 'Unknown Opponent'}</div>
                                                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                                                {new Date(m.date).toLocaleDateString()} • {m.map || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-6">
                                                        <div className="text-center">
                                                            <div className="text-xs font-black text-white">{m.kills}/{m.deaths}/{m.assists}</div>
                                                            <div className="text-[7px] text-slate-600 font-black uppercase tracking-widest">KDA</div>
                                                        </div>
                                                        <div className="text-center w-12">
                                                            <div className="text-xs font-black text-amber-500">{m.acs || 0}</div>
                                                            <div className="text-[7px] text-amber-500/40 font-black uppercase tracking-widest">ACS</div>
                                                        </div>
                                                        <div className="hidden md:block">
                                                            <div className="flex items-center space-x-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                                                <img
                                                                    src={`/assets/agents/${(m.agent || 'Unknown').replace('/', '_')}${m.agent === 'Veto' ? '.webp' : '.png'}`}
                                                                    className="w-4 h-4 object-contain"
                                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                />
                                                                <span className="text-[9px] text-slate-400 font-black uppercase">{m.agent}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(!breakdown.agentStats || breakdown.agentStats.length === 0) && (!breakdown.roleStats || breakdown.roleStats.length === 0) && (
                                    <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">No advanced intel available.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {userRole && isAuthorized(userRole) && breakdownError && !loadingBreakdown && (
                            <div className="flex flex-col items-center justify-center py-12 px-6 space-y-4 bg-red-500/5 rounded-[32px] border border-red-500/20 animate-in fade-in zoom-in-95 duration-500">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <h5 className="text-red-500 font-black uppercase tracking-[0.4em] text-xs">Tactical Feed Disrupted</h5>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-center max-w-xs leading-relaxed">{breakdownError}</p>
                                <button
                                    onClick={() => {
                                        setLoadingBreakdown(true);
                                        setBreakdownError(null);
                                    }}
                                    className="mt-4 px-8 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border border-red-500/20"
                                >
                                    Attempt Reconnection
                                </button>
                            </div>
                        )}
                    </div>
                </div>}
            </Modal>

            <Modal isOpen={!!selectedMatchForStats} onClose={() => setSelectedMatchForStats(null)} zIndex={2000}>
                {selectedMatchForStats && (
                    <div className="bg-[#020617] p-8 md:p-12 rounded-[40px] shadow-2xl w-full max-w-4xl border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

                        <div className="relative z-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Engagement Analysis</h3>
                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] mt-2">
                                        vs {selectedMatchForStats.opponent} • {new Date(selectedMatchForStats.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedMatchForStats(null)} className="text-slate-500 hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {loadingDetails ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Retrieving Neural Archives...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <div className="col-span-4">Operator</div>
                                        <div className="col-span-2 text-center text-indigo-400">Agent</div>
                                        <div className="col-span-2 text-center">K/D/A</div>
                                        <div className="col-span-2 text-center text-amber-500">ACS</div>
                                        <div className="col-span-2 text-center">Map</div>
                                    </div>
                                    <div className="space-y-3">
                                        {matchDetails.map((stat, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                                <div className="col-span-4 flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-500 border border-emerald-500/20">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-sm font-black text-white uppercase tracking-tight truncate">{stat.playerName || 'Unknown'}</span>
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                        <img
                                                            src={`/assets/agents/${(stat.agent || 'Unknown').replace('/', '_')}${stat.agent === 'Veto' ? '.webp' : '.png'}`}
                                                            className="w-4 h-4 object-contain"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">{stat.agent}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <div className="text-xs font-black text-white">{stat.kills}/{stat.deaths}/{stat.assists}</div>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <div className="text-xs font-black text-amber-500">{stat.acs || 0}</div>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{stat.map || 'N/A'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default PlayerStatsModal;
