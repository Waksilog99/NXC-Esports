import React, { useEffect, useState } from 'react';
import Modal from './Modal';

interface Sponsor {
    id: number;
    name: string;
    tier: string;
    logo: string;
    description: string;
    website: string;
}

import { GET_API_BASE_URL } from '../utils/apiUtils';
import RocketLoader from './RocketLoader';
import PartnershipModal from './PartnershipModal';
import MediaKitModal from './MediaKitModal';

const Sponsors: React.FC = () => {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLaunching, setIsLaunching] = useState(false);
    const [showPartnershipModal, setShowPartnershipModal] = useState(false);
    const [showMediaKit, setShowMediaKit] = useState(false);

    useEffect(() => {
        fetch(`${GET_API_BASE_URL()}/api/sponsors`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setSponsors(result.data || []);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

    const handleInitiatePartnership = () => {
        setIsLaunching(true);
    };

    const handleLaunchComplete = () => {
        setIsLaunching(false);
        setShowPartnershipModal(true);
    };

    return (
        <div className="space-y-16 animate-in fade-in duration-700 pb-20">
            {isLaunching && <RocketLoader onComplete={handleLaunchComplete} />}
            <PartnershipModal isOpen={showPartnershipModal} onClose={() => setShowPartnershipModal(false)} />
            <MediaKitModal
                isOpen={showMediaKit}
                onClose={() => setShowMediaKit(false)}
                onBoosterClick={() => {
                    setShowMediaKit(false);
                    handleInitiatePartnership();
                }}
            />

            {/* Header / CTA */}
            <div className="relative rounded-[30px] md:rounded-[50px] overflow-hidden bg-[#020617]/40 backdrop-blur-3xl border border-white/5 p-8 md:p-20 text-center group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/[0.03] blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/[0.03] blur-[150px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-4xl mx-auto space-y-6 md:space-y-10">
                    <div className="inline-flex items-center space-x-3 px-4 md:px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] md:tracking-[0.4em] shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_#fbbf24]" />
                        <span>Waks Strategic Alliance Protocol</span>
                    </div>

                    <h2 className="text-3xl md:text-7xl font-black text-white italic tracking-tighter leading-[0.9] uppercase">
                        Architect the Future of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 drop-shadow-[0_0_30px_rgba(251,191,36,0.2)]">Global Dominance</span>
                    </h2>

                    <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Join an elite network of sovereign partners driving the next evolution of esports. Unlock high-authority brand integrations and direct citadel access.
                    </p>

                    <div className="pt-4 md:pt-6 flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
                        <button
                            onClick={handleInitiatePartnership}
                            className="px-8 md:px-12 py-4 md:py-5 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] rounded-2xl transition-all shadow-2xl shadow-amber-500/20 active:scale-95 border-t border-white/20"
                        >
                            Initiate Partnership
                        </button>
                        <button
                            onClick={() => setShowMediaKit(true)}
                            className="px-8 md:px-12 py-4 md:py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] rounded-2xl transition-all backdrop-blur-xl active:scale-95"
                        >
                            Protocol Media Kit
                        </button>
                    </div>
                </div>
            </div>

            {/* Sponsor Grid */}
            <div className="space-y-12">
                <div className="flex items-center space-x-6">
                    <div className="h-px bg-amber-500/20 flex-grow" />
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.6em] whitespace-nowrap">Strategic Theater Partners</h3>
                    <div className="h-px bg-amber-500/20 flex-grow" />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-50">
                        <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Establishing Encryption Link...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sponsors.map((sponsor) => {
                            const getTierStyles = (tier: string) => {
                                switch (tier) {
                                    case 'Platinum':
                                        return {
                                            card: 'bg-purple-600/5 hover:border-purple-500/30 shadow-purple-500/5',
                                            badge: 'bg-purple-600/10 text-purple-400 border-purple-500/20',
                                            glow: 'via-purple-500/50'
                                        };
                                    case 'Gold':
                                        return {
                                            card: 'bg-amber-500/5 hover:border-amber-500/30 shadow-amber-500/5',
                                            badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                            glow: 'via-amber-500/50'
                                        };
                                    case 'Silver':
                                        return {
                                            card: 'bg-slate-400/5 hover:border-slate-400/30 shadow-slate-400/5',
                                            badge: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
                                            glow: 'via-slate-400/50'
                                        };
                                    case 'Bronze':
                                        return {
                                            card: 'bg-orange-600/5 hover:border-orange-500/30 shadow-orange-500/5',
                                            badge: 'bg-orange-600/10 text-orange-400 border-orange-500/20',
                                            glow: 'via-orange-500/50'
                                        };
                                    default:
                                        return {
                                            card: 'bg-white/5 hover:border-white/20 shadow-white/5',
                                            badge: 'bg-white/5 text-slate-500 border-white/5',
                                            glow: 'via-white/20'
                                        };
                                }
                            };

                            const styles = getTierStyles(sponsor.tier);

                            return (
                                <div
                                    key={sponsor.id}
                                    onClick={() => setSelectedSponsor(sponsor)}
                                    className={`group backdrop-blur-2xl p-8 md:p-12 rounded-[30px] md:rounded-[40px] border border-white/5 transition-all text-center flex flex-col items-center cursor-pointer hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden ${styles.card}`}
                                >
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${styles.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                                    <div className="h-20 md:h-28 flex items-center justify-center mb-6 md:mb-10 grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110">
                                        <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-[180px] md:max-w-[220px] drop-shadow-2xl" />
                                    </div>

                                    <h4 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter mb-4 group-hover:text-amber-500 transition-colors">{sponsor.name}</h4>

                                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] mb-6 border shadow-lg ${styles.badge}`}>
                                        {sponsor.tier} Component
                                    </div>

                                    <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-3 max-w-xs">
                                        {sponsor.description}
                                    </p>

                                    <div className="mt-8 pt-8 border-t border-white/5 w-full">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] group-hover:text-amber-500/60 transition-colors italic">Access Partner Intel →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sponsor Detail Modal */}
            <Modal isOpen={!!selectedSponsor} onClose={() => setSelectedSponsor(null)} zIndex={200} backdropClassName="bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" className="w-full max-w-3xl">
                {selectedSponsor && <div className="bg-[#020617] w-full rounded-[50px] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-500 relative group/modal">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/[0.04] blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative h-72 bg-white/[0.01] flex items-center justify-center overflow-hidden p-16 border-b border-white/5">
                        <img src={selectedSponsor.logo} alt={selectedSponsor.name} className="max-h-full max-w-[85%] object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] group-hover/modal:scale-105 transition-transform duration-700" />

                        <button
                            onClick={() => setSelectedSponsor(null)}
                            className="absolute top-8 right-8 w-14 h-14 bg-white/5 hover:bg-amber-500 hover:text-black text-white rounded-[20px] flex items-center justify-center transition-all border border-white/10 backdrop-blur-md active:scale-95 shadow-2xl"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="p-8 md:p-16">
                        <div className="flex flex-col items-center text-center mb-8 md:mb-12">
                            {(() => {
                                const getBadgeStyle = (tier: string) => {
                                    switch (tier) {
                                        case 'Platinum': return 'bg-purple-600 text-white border-white/20 shadow-purple-500/20';
                                        case 'Gold': return 'bg-amber-500 text-black border-white/20 shadow-amber-500/20';
                                        case 'Silver': return 'bg-slate-400 text-black border-white/20 shadow-slate-400/20';
                                        case 'Bronze': return 'bg-orange-600 text-white border-white/20 shadow-orange-500/20';
                                        default: return 'bg-white/10 text-white border-white/5';
                                    }
                                };
                                return (
                                    <div className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] mb-6 border shadow-2xl ${getBadgeStyle(selectedSponsor.tier)}`}>
                                        {selectedSponsor.tier} Partner Status
                                    </div>
                                );
                            })()}
                            <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-2">{selectedSponsor.name}</h2>
                            <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent w-24 md:w-32 mt-4 md:mt-6" />
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-center">
                            <p className="text-xl text-slate-400 font-medium leading-relaxed whitespace-pre-line px-4">
                                {selectedSponsor.description}
                            </p>
                        </div>

                        <div className="mt-16 pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-center gap-6">
                            <button
                                onClick={() => setSelectedSponsor(null)}
                                className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl transition-all border border-white/10"
                            >
                                De-Authorize Link
                            </button>
                            {selectedSponsor.website && (
                                <a
                                    href={selectedSponsor.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-12 py-5 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl shadow-amber-500/20 active:scale-95 border-t border-white/20 flex items-center justify-center"
                                >
                                    Transmit to Portal
                                    <svg className="w-4 h-4 ml-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>}
            </Modal>
        </div>
    );
};

export default Sponsors;

