import React, { useState, useEffect } from 'react';
import TeamManagement from './TeamManagement';
import QuotaTracker from './QuotaTracker';
import PlayerStatsModal, { PlayerStats } from './PlayerStatsModal';
import Playbook from './Playbook';
import { GET_API_BASE_URL } from '../utils/apiUtils';

interface PlayerConsoleProps {
    userId: number;
    userRole: string;
    onBack?: () => void;
}

const PlayerConsole: React.FC<PlayerConsoleProps> = ({ userId, userRole, onBack }) => {
    const [playersTeamId, setPlayersTeamId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const [playerInfo, setPlayerInfo] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'scrims' | 'tournaments' | 'playbook'>('scrims');
    const [currentSubView, setCurrentSubView] = useState<string>('calendar');
    const [isStatsOpen, setIsStatsOpen] = useState(false);

    useEffect(() => {
        if (!userId) return;
        // Fetch the player's team based on their userId
        fetch(`${GET_API_BASE_URL()}/api/players?userId=${userId}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    const data = result.data;
                    const player = Array.isArray(data) ? data[0] : data;
                    if (player) {
                        setPlayerInfo(player);
                        if (player.teamId) {
                            setPlayersTeamId(player.teamId);
                        }
                    }
                } else {
                    console.error("Player fetch error:", result.error);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-pulse">
                <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-emerald-500 font-black uppercase tracking-[0.4em] text-[10px]">Syncing Tactical Uplink...</p>
            </div>
        );
    }

    if (!playersTeamId) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-8">
                <div className="w-24 h-24 bg-red-500/10 rounded-[40px] flex items-center justify-center border border-red-500/20 shadow-2xl">
                    <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">No Active Deployment</h2>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed font-medium">
                        Your identity is registered as a <span className="text-emerald-500 font-bold uppercase">Player</span>, but you are not currently assigned to a tactical squad. Please contact your Manager for recruitment.
                    </p>
                </div>
            </div>
        );
    }


    // Reuse TeamManagement but limit it to the player's team
    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-8 border-emerald-500 pl-10 py-6 bg-white/[0.02] shadow-2xl rounded-r-[30px]">
                <div>
                    <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">Team View</h2>
                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] mt-2 italic shadow-emerald-500/20 shadow-sm">Operative Tactical Access // ID: {userId}</p>
                </div>

                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-3xl">
                    <button
                        onClick={() => setActiveTab('scrims')}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${activeTab === 'scrims'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-500 hover:text-emerald-400'
                            }`}
                    >
                        Scrims
                    </button>
                    <button
                        onClick={() => setActiveTab('tournaments')}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${activeTab === 'tournaments'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-500 hover:text-emerald-400'
                            }`}
                    >
                        Tournaments
                    </button>
                    <button
                        onClick={() => setActiveTab('playbook')}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${activeTab === 'playbook'
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'text-slate-500 hover:text-emerald-400'
                            }`}
                    >
                        Playbook
                    </button>
                </div>

                <button
                    onClick={() => setIsStatsOpen(true)}
                    className="flex items-center space-x-3 px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl border border-emerald-500/20 backdrop-blur-3xl transition-all group active:scale-95 shadow-lg"
                >
                    <svg className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">Tactical Statistics</span>
                </button>

                <div className="px-10 py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur-3xl hidden md:block">
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Clearance: ACTIVE_OPERATIVE</p>
                </div>
            </div>

            {playersTeamId && playerInfo && activeTab === 'scrims' && currentSubView === 'quota' && (
                <QuotaTracker
                    playerId={playerInfo.id}
                    teamId={playersTeamId}
                    game={playerInfo.teamGame || ''}
                />
            )}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'playbook' ? (
                    <Playbook
                        userId={userId}
                        userRole="player"
                        lockedTeamId={playersTeamId}
                    />
                ) : (
                    <TeamManagement
                        key={activeTab}
                        userId={userId}
                        userRole="player"
                        lockedTeamId={playersTeamId}
                        mode={activeTab === 'scrims' ? 'scrim' : 'tournament'}
                        onViewChange={(v) => setCurrentSubView(v)}
                        onBack={onBack}
                    />
                )}
            </div>

            {playerInfo && (
                <PlayerStatsModal
                    player={playerInfo}
                    isOpen={isStatsOpen}
                    onClose={() => setIsStatsOpen(false)}
                    userRole={userRole}
                    currentUserId={userId}
                    showAdvancedIntel={true}
                />
            )}
        </div>
    );
};

export default PlayerConsole;
