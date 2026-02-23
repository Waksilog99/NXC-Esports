import React, { useEffect, useState, useMemo } from 'react';
import { GAME_TITLES } from './constants';
import Modal from './Modal';

interface Achievement {
    id: number;
    title: string;
    date: string;
    description: string;
    image: string;
    placement: string;
    game?: string;
}

const getPlacementPriority = (placement: string): number => {
    const p = placement.toLowerCase();
    if (p.includes('champion') || p.includes('1st') || p.includes('winner')) return 100;
    if (p.includes('2nd') || p.includes('runner')) return 80;
    if (p.includes('3rd') || p.includes('finalist')) return 60;
    if (p.includes('top 5') || p.includes('top 4')) return 40;
    if (p.includes('top 10')) return 20;
    return 10;
};

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

const Achievements: React.FC = () => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterGame, setFilterGame] = useState('All Games');
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/achievements`)
            .then(res => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then(result => {
                if (result.success) {
                    setAchievements(result.data || []);
                } else {
                    throw new Error(result.error || "Failed to retrieve archives");
                }
            })
            .catch(err => {
                console.error("Achievements fetch failed:", err);
                setError("Failed to retrieve the Legacy Archives. Connection lost.");
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredAndSorted = useMemo(() => {
        let list = [...achievements];
        if (filterGame !== 'All Games') {
            list = list.filter(a => a.game === filterGame);
        }

        return list.sort((a, b) => {
            const priorityA = getPlacementPriority(a.placement);
            const priorityB = getPlacementPriority(b.placement);
            if (priorityA !== priorityB) return priorityB - priorityA;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [achievements, filterGame]);

    const displayAchievements = filteredAndSorted.slice(0, 9);
    const archivedAchievements = filteredAndSorted.slice(9);

    return (
        <div className="space-y-24 animate-in fade-in zoom-in duration-700 pb-32">
            {/* Elite Header - Datacard Style */}
            <div className="relative text-center space-y-12 py-16">
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                    <span className="text-[140px] md:text-[240px] font-black text-white italic tracking-tighter uppercase whitespace-nowrap">HISTORY</span>
                </div>

                <div className="relative z-10 space-y-6">
                    <AnimatedTitle
                        text1="Hall of"
                        text2="Excellence"
                        className="text-6xl md:text-9xl font-black tracking-tighter uppercase italic leading-[0.8]"
                    />

                    <div className="flex items-center justify-center space-x-6 max-w-4xl mx-auto">
                        <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/20"></div>
                        <p className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase tracking-[0.6em] whitespace-nowrap">Documenting the Apex of Performance</p>
                        <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/20"></div>
                    </div>

                    {/* Tactical Game Filter - Pill Style */}
                    <div className="flex justify-center pt-8">
                        <div className="flex flex-wrap justify-center gap-4 p-2.5 bg-white/5 backdrop-blur-2xl rounded-[35px] border border-white/10 shadow-2xl">
                            {['All Games', ...GAME_TITLES].map(game => (
                                <button
                                    key={game}
                                    onClick={() => setFilterGame(game)}
                                    className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden group ${filterGame === game
                                        ? 'bg-amber-500 text-black shadow-[0_10px_20px_rgba(245,158,11,0.2)] scale-105'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="relative z-10">{game}</span>
                                    {filterGame === game && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center space-y-8 py-32">
                    <div className="w-16 h-16 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-[0.4em] animate-pulse">Decrypting Legacy Archives...</p>
                </div>
            ) : error ? (
                <div className="text-center py-32 bg-red-500/5 rounded-[40px] border border-red-500/20">
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">{error}</p>
                </div>
            ) : (
                <div className="space-y-32">
                    {/* Featured Achievement Datacard */}
                    {displayAchievements.length > 0 && filterGame === 'All Games' && (
                        <div
                            onClick={() => setSelectedAchievement(displayAchievements[0])}
                            className="group relative overflow-hidden rounded-[50px] bg-[#020617] border border-amber-500/20 shadow-[0_0_100px_rgba(245,158,11,0.05)] cursor-pointer transition-all duration-700 hover:border-amber-500/40"
                        >
                            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-1000">
                                <img src={displayAchievements[0].image} className="w-full h-full object-cover blur-md scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
                            </div>

                            <div className="relative z-10 p-16 md:p-24 flex flex-col items-center text-center space-y-12">
                                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                                    <span className="text-[180px] md:text-[280px] font-black text-white italic tracking-tighter uppercase whitespace-nowrap">APEX</span>
                                </div>

                                <div className="space-y-6">
                                    <AnimatedTitle
                                        text1="Hall of"
                                        text2="Excellence"
                                        className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.8]"
                                    />
                                    <div className="flex items-center justify-center space-x-6 w-full max-w-2xl mx-auto">
                                        <div className="h-[1px] flex-grow bg-amber-500/30"></div>
                                        <p className="text-[10px] md:text-[12px] text-slate-500 font-black uppercase tracking-[0.6em] whitespace-nowrap">The Apex of Performance // Legacy Record</p>
                                        <div className="h-[1px] flex-grow bg-amber-500/30"></div>
                                    </div>
                                </div>

                                <div className="space-y-8 flex flex-col items-center">
                                    <h3 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none group-hover:text-amber-500 transition-colors">
                                        {displayAchievements[0].title}
                                    </h3>
                                    <div className="pt-4">
                                        <span className="px-12 py-4 bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.4em] rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)] group-hover:scale-110 transition-transform">
                                            Access Intel
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Primary Grid - Max 9 (Starting from index 1 if featured) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
                        {(filterGame === 'All Games' ? displayAchievements.slice(1) : displayAchievements).map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedAchievement(item)}
                                className="group relative bg-[#020617]/40 backdrop-blur-3xl border border-white/5 rounded-[45px] p-1 shadow-2xl transition-all duration-700 hover:shadow-amber-500/10 cursor-pointer overflow-hidden active:scale-[0.98]"
                            >
                                <div className="bg-gradient-to-b from-white/5 to-transparent p-10 rounded-[42px] h-full flex flex-col space-y-8">
                                    <div className="relative h-48 rounded-[35px] overflow-hidden border border-white/5 shadow-inner">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                        {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                <svg className="w-16 h-16 text-white/5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute bottom-6 left-6 z-20">
                                            <span className="px-4 py-1.5 bg-amber-500 text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-lg shadow-xl border-t border-white/30">
                                                {item.placement}
                                            </span>
                                        </div>
                                        {item.game && (
                                            <div className="absolute top-6 left-6 z-20">
                                                <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-slate-300 text-[8px] font-black uppercase tracking-widest rounded-md border border-white/10">
                                                    {item.game}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest">{new Date(item.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight group-hover:text-amber-500 transition-colors duration-300 leading-tight">
                                                {item.title}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-500 font-bold leading-relaxed line-clamp-2">
                                            {item.description}
                                        </p>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                            Access Intel <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-100">
                                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#fbbf24]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legacy Archives - Scrollable Overflow */}
                    {archivedAchievements.length > 9 && (
                        <div className="pt-24 border-t border-white/5 space-y-12">
                            <div className="flex items-center space-x-6">
                                <h3 className="text-[14px] text-slate-500 font-black uppercase tracking-[0.6em]">Legacy Archives</h3>
                                <div className="h-px flex-grow bg-gradient-to-r from-white/5 to-transparent"></div>
                                <span className="text-[10px] text-amber-500/40 font-black">{archivedAchievements.length} RECORDS SECURED</span>
                            </div>

                            <div className="flex overflow-x-auto pb-12 gap-8 scrollbar-thin scrollbar-thumb-amber-500/10 scrollbar-track-transparent snap-x snap-mandatory">
                                {archivedAchievements.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedAchievement(item)}
                                        className="flex-shrink-0 w-80 group relative bg-[#020617]/20 border border-white/5 rounded-[35px] p-8 shadow-xl transition-all hover:bg-amber-500/5 snap-center cursor-pointer"
                                    >
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest">{item.placement}</span>
                                                <span className="text-[8px] text-slate-600 font-bold">{new Date(item.date).getFullYear()}</span>
                                            </div>
                                            <h4 className="text-lg font-black text-white uppercase italic tracking-tight leading-tight group-hover:text-amber-500 transition-colors">
                                                {item.title}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 font-bold line-clamp-3 leading-relaxed">
                                                {item.description}
                                            </p>
                                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">{item.game || 'GLOBAL'}</span>
                                                <svg className="w-4 h-4 text-amber-500/20 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detail Modal */}
                    <Modal isOpen={!!selectedAchievement} onClose={() => setSelectedAchievement(null)} zIndex={1000} backdropClassName="bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500" className="w-full max-w-4xl">
                        {selectedAchievement && <div className="bg-[#020617] w-full max-h-[85vh] overflow-y-auto rounded-[50px] shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative scrollbar-hide">
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

                            <div className="relative min-h-[600px] flex flex-col justify-between py-16 bg-[#020617]">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/20 z-10" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                                    <span className="text-[200px] md:text-[300px] font-black text-white italic tracking-tighter uppercase whitespace-nowrap">HISTORY</span>
                                </div>

                                {selectedAchievement.image ? (
                                    <img src={selectedAchievement.image} className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                        <svg className="w-32 h-32 text-white/5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                    </div>
                                )}

                                <div className="relative z-20 w-full flex flex-col items-center space-y-8">
                                    <div className="space-y-6 text-center pointer-events-none px-12">
                                        <AnimatedTitle
                                            text1="Hall of"
                                            text2="Excellence"
                                            className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.8]"
                                        />
                                        <div className="flex items-center justify-center space-x-6 w-full max-w-2xl mx-auto">
                                            <div className="h-[1px] flex-grow bg-amber-500/30"></div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] whitespace-nowrap">Documenting the Apex of Performance</p>
                                            <div className="h-[1px] flex-grow bg-amber-500/30"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-20 w-full flex flex-col items-center space-y-6 px-12 text-center pointer-events-none">
                                    <div className="flex items-center space-x-4">
                                        <span className="px-8 py-2.5 bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-2xl border-t border-white/40">
                                            {selectedAchievement.placement}
                                        </span>
                                        {selectedAchievement.game && (
                                            <span className="px-6 py-2.5 bg-black/60 backdrop-blur-xl text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-white/10">
                                                {selectedAchievement.game}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                        {selectedAchievement.title}
                                    </h2>
                                </div>

                                <button
                                    onClick={() => setSelectedAchievement(null)}
                                    className="absolute top-8 right-8 w-14 h-14 bg-black/40 hover:bg-amber-500 hover:text-black text-white rounded-[20px] flex items-center justify-center transition-all duration-300 backdrop-blur-xl border border-white/10 group active:scale-90 z-[30]"
                                >
                                    <svg className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-12 md:p-16 space-y-12 bg-[#020617]">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-8 border-y border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.4em]">Historical Date</p>
                                        <p className="text-xl text-white font-black italic uppercase">{new Date(selectedAchievement.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-8 h-1 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-w-3xl">
                                    <p className="text-xl text-slate-400 font-bold leading-relaxed whitespace-pre-line italic">
                                        {selectedAchievement.description}
                                    </p>
                                </div>

                                <div className="flex justify-start">
                                    <button
                                        onClick={() => setSelectedAchievement(null)}
                                        className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl transition-all border border-white/5 active:scale-95"
                                    >
                                        Return to Archives
                                    </button>
                                </div>
                            </div>
                        </div>}
                    </Modal>
                </div>
            )}
        </div>
    );
};

export default Achievements;
