
import React from 'react';
import Modal from './Modal';

interface MediaKitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBoosterClick: () => void; // Link to Initiate Partnership
}

const MediaKitModal: React.FC<MediaKitModalProps> = ({ isOpen, onClose, onBoosterClick }) => {
    if (!isOpen) return null;

    // --- CUSTOMIZABLE DATA SECTION ---
    const STATS = [
        { label: 'Total Reach', value: '5.2M+', sub: 'Monthly Impressions' },
        { label: 'Active Legion', value: '125K+', sub: 'Discord Members' },
        { label: 'Engagement', value: '18.5%', sub: 'Avg. Interaction Rate' },
        { label: 'Global Footprint', value: '42', sub: 'Countries Represented' },
    ];

    const DEMOGRAPHICS = [
        { range: '18-24', percent: '45%', label: 'Gen Z Core' },
        { range: '25-34', percent: '38%', label: 'Millennial Pros' },
        { range: '35+', percent: '17%', label: 'Veteran Gamers' },
    ];

    const TIERS = [
        {
            name: 'Silver / Support',
            price: 'Start-up Tier',
            features: ['Logo on NXC Website', 'Discord Role & Channel', 'Quarterly Social Blast', 'Community Night Access'],
            color: 'border-slate-500 text-slate-400',
            bg: 'bg-slate-500/10'
        },
        {
            name: 'Gold / Vanguard',
            price: 'Growth Tier',
            features: ['Stream Overlay Placement', 'Jersey Shoulder Patch', 'Monthly Content Feature', 'Product Giveaways', 'VIP Event Access'],
            color: 'border-amber-500 text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            name: 'Platinum / Citadel',
            price: 'Dominance Tier',
            features: ['Jersey Chest Sponsor', 'Main Stage Branding', 'Exclusive Video Series', 'Tournament Title Sponsor', 'Direct Player Access'],
            color: 'border-purple-500 text-purple-400',
            bg: 'bg-purple-600/10'
        }
    ];
    // ---------------------------------

    return (
        <Modal isOpen={isOpen} onClose={onClose} zIndex={200} backdropClassName="bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" className="w-full max-w-5xl h-[85vh]">
            <div className="relative w-full max-w-5xl h-[85vh] bg-[#020617] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col">

                {/* Header Banner */}
                <div className="relative h-48 sm:h-64 bg-gradient-to-r from-amber-700 via-[#020617] to-purple-900 flex items-end p-8 sm:p-12 shrink-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-transparent to-[#020617]"></div>

                    <div className="relative z-10 w-full flex justify-between items-end">
                        <div>
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Classified Intelligence</span>
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                                NXC <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Media Kit</span>
                            </h2>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto custom-scrollbar p-8 sm:p-12 space-y-16">

                    {/* Mission */}
                    <section className="text-center max-w-3xl mx-auto space-y-6">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">Mission Protocol</p>
                        <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                            "Forging the next generation of esports dominance through architectural precision and community sovereignty."
                        </h3>
                    </section>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {STATS.map((stat, i) => (
                            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center hover:bg-white/[0.07] transition-colors group">
                                <h4 className="text-3xl sm:text-4xl font-black text-white mb-1 group-hover:text-amber-500 transition-colors">{stat.value}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-[9px] text-slate-600 mt-2">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Demographics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                Operative <span className="text-purple-500">Demographics</span>
                            </h3>
                            <p className="text-slate-400 leading-relaxed">
                                Our audience consists of high-value, tech-savvy individuals who define the digital frontier.
                                NXC commands attention where it matters most.
                            </p>

                            <div className="space-y-4">
                                {DEMOGRAPHICS.map((demo, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <div className="w-16 text-right font-black text-white text-xl">{demo.percent}</div>
                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-purple-500' : 'bg-slate-600'}`}
                                                style={{ width: demo.percent }}
                                            />
                                        </div>
                                        <div className="w-24 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{demo.range} <br /><span className="text-slate-600 font-normal normal-case">{demo.label}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Map Visual (Conceptual) */}
                        <div className="relative aspect-video bg-[#050a1f] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center group opacity-80 hover:opacity-100 transition-opacity">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-[#020617] to-[#020617]"></div>
                            {/* Simple abstract map dots */}
                            <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping delay-700"></div>
                            <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-white rounded-full animate-ping delay-1000"></div>

                            <div className="z-10 text-center">
                                <h4 className="text-3xl font-black text-white mb-2">{STATS[3].value}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Strongholds Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Tiers */}
                    <div className="space-y-8">
                        <div className="text-center">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Alliance Tiers</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {TIERS.map((tier, i) => (
                                <div key={i} className={`p-8 rounded-3xl border ${tier.color} ${tier.bg} hover:scale-105 transition-transform duration-300 flex flex-col justify-between`}>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">{tier.name.split(' / ')[1]}</div>
                                        <h4 className="text-2xl font-black mb-2">{tier.name.split(' / ')[0]}</h4>
                                        <p className="text-xs font-medium opacity-60 mb-8 uppercase tracking-widest">{tier.price}</p>

                                        <ul className="space-y-3 mb-8">
                                            {tier.features.map((feat, j) => (
                                                <li key={j} className="flex items-start space-x-2 text-xs font-bold opacity-80">
                                                    <span>•</span>
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <button
                                        onClick={() => { onClose(); onBoosterClick(); }}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors"
                                    >
                                        Select Tier
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assets Download */}
                    <div className="bg-white/5 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between border border-white/5">
                        <div className="mb-6 sm:mb-0">
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">Brand Assets</h3>
                            <p className="text-xs text-slate-500">Vector logos, color palettes, and typography guidelines.</p>
                        </div>
                        <div className="flex space-x-4">
                            <a
                                href="/brand-assets/nxc-logo-vector.svg"
                                download="NXC_Logo_Vector.svg"
                                className="px-6 py-3 bg-black border border-white/10 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:border-amber-500 transition-colors flex items-center justify-center"
                            >
                                Download .SVG
                            </a>
                            <a
                                href="/brand-assets/nxc-brand-guidelines.txt"
                                download="NXC_Brand_Guidelines.txt"
                                className="px-6 py-3 bg-black border border-white/10 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:border-purple-500 transition-colors flex items-center justify-center"
                            >
                                Download Guide
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </Modal>
    );
};

export default MediaKitModal;
