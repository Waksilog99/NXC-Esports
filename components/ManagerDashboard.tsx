import React, { useState, useEffect } from 'react';
import { useNotification } from '../hooks/useNotification';
import PerformanceTracker from './PerformanceTracker';
import AddAchievementForm from './AddAchievementForm';
import TacticalIntelGraphs from './TacticalIntelGraphs';
import { GAME_TITLES, GAME_ROLES, GAME_CATEGORY } from './constants';
import Modal from './Modal';

interface Team {
    id: number;
    name: string;
    game: string;
}

const ManagerDashboard: React.FC<{
    userId?: number,
    userRole?: string,
    onNavigate?: (view: string) => void
}> = ({ userId, userRole, onNavigate }) => {
    const [view, setView] = useState<'menu' | 'create-team' | 'manage-roster' | 'log-achievement' | 'performance-tracker' | 'tournament-network'>('menu');
    const [teams, setTeams] = useState<Team[]>([]);
    const { showNotification } = useNotification();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [view]);

    // Form States
    const [teamName, setTeamName] = useState('');
    const [teamGame, setTeamGame] = useState('');
    const [teamDesc, setTeamDesc] = useState('');

    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedRosterUserId, setSelectedRosterUserId] = useState(''); // New state for selected user to add to roster
    const [usersList, setUsersList] = useState<any[]>([]); // New state for users list
    const [playerName, setPlayerName] = useState('');
    const [playerRole, setPlayerRole] = useState('');

    // Search states
    const [personnelSearch, setPersonnelSearch] = useState('');
    const [squadSearch, setSquadSearch] = useState('');
    const [showPersonnelResults, setShowPersonnelResults] = useState(false);
    const [showSquadResults, setShowSquadResults] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSquadForModal, setSelectedSquadForModal] = useState<any | null>(null);

    const handleRemovePlayer = async (teamId: number, playerId: number) => {
        if (!window.confirm('Are you sure you want to remove this operative from the active registry?')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/teams/${teamId}/players/${playerId}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.success) {
                showNotification({
                    message: 'Operative removed from active duty.',
                    type: 'success'
                });
                // Refresh teams to update player list
                const url = userRole === 'manager'
                    ? `${import.meta.env.VITE_API_BASE_URL}/api/teams?managerId=${userId}`
                    : `${import.meta.env.VITE_API_BASE_URL}/api/teams`;
                const resTeams = await fetch(url);
                const resTeamsResult = await resTeams.json();
                if (resTeamsResult.success) {
                    setTeams(resTeamsResult.data);
                }
            } else {
                showNotification({
                    message: result.error || 'Failed to remove operative.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            showNotification({
                message: 'Error removing operative.',
                type: 'error'
            });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (view === 'menu') return;
            setLoading(true);
            setError(null);
            try {
                // Teams
                if (view === 'manage-roster' || view === 'performance-tracker' || view === 'tournament-network') {
                    const url = (userRole === 'manager' && userId)
                        ? `${import.meta.env.VITE_API_BASE_URL}/api/teams?managerId=${userId}`
                        : `${import.meta.env.VITE_API_BASE_URL}/api/teams`;
                    const res = await fetch(url);
                    const result = await res.json();
                    if (result.success) {
                        setTeams(result.data);
                    } else {
                        throw new Error(result.error || 'Failed to fetch teams');
                    }
                }

                // Users
                if (view === 'manage-roster') {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`);
                    const result = await res.json();
                    // /api/users returns a plain array (no success wrapper)
                    const userArray = Array.isArray(result) ? result : (result.data || []);
                    if (userArray.length >= 0) {
                        setUsersList(userArray);
                    } else {
                        throw new Error(result.error || 'Failed to fetch user directory');
                    }
                }
            } catch (err: any) {
                console.error("Manager fetch failed:", err);
                setError(err.message || "Connection to Identity API severed.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [view]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: teamName, game: teamGame, description: teamDesc, managerId: userId })
            });
            const result = await res.json();
            if (result.success) {
                showNotification({
                    message: 'Team created!',
                    type: 'success'
                });
                setView('menu');
                setTeamName(''); setTeamGame(''); setTeamDesc('');
            } else {
                showNotification({
                    message: result.error || 'Failed to create team.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            showNotification({
                message: 'Error creating team.',
                type: 'error'
            });
        }
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/teams/${selectedTeam}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedRosterUserId,
                    name: playerName,
                    role: playerRole,
                    kda: "0.00",
                    winRate: "0%",
                    acs: "0"
                })
            });
            const result = await res.json();
            if (result.success) {
                showNotification({
                    message: 'Player added! Stats initialized to zero protocol.',
                    type: 'success'
                });
                setSelectedRosterUserId(''); setPlayerName(''); setPlayerRole('');
                // Refresh teams for better UX
                const resTeams = await fetch(userRole === 'manager' && userId
                    ? `${import.meta.env.VITE_API_BASE_URL}/api/teams?managerId=${userId}`
                    : `${import.meta.env.VITE_API_BASE_URL}/api/teams`);
                const resTeamsResult = await resTeams.json();
                if (resTeamsResult.success) {
                    setTeams(resTeamsResult.data);
                }
            } else {
                showNotification({
                    message: result.error || 'Failed to add player.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            showNotification({
                message: 'Error adding player.',
                type: 'error'
            });
        }
    };


    return (
        <div
            className="backdrop-blur-3xl rounded-[32px] md:rounded-[48px] p-6 md:p-12 border mt-8 md:mt-12 transition-all relative overflow-hidden group"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', boxShadow: 'var(--card-shadow)' }}
        >
            <div className="absolute top-0 right-0 p-6 md:p-12">
                <div className="w-32 h-32 md:w-64 md:h-64 bg-purple-500/5 blur-[80px] md:blur-[120px] rounded-full group-hover:bg-purple-500/10 transition-all duration-1000" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 relative z-10 gap-6 md:gap-8">
                <div className="flex items-center space-x-4 md:space-x-6">
                    {(view !== 'menu' || !!onNavigate) && (
                        <button
                            onClick={() => view === 'menu' ? (onNavigate && onNavigate('home')) : setView('menu')}
                            className="p-3 md:p-4 bg-white/5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 rounded-2xl transition-all border border-white/10 group/back shadow-lg active:scale-95"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-[var(--text-color)] tracking-tighter uppercase italic leading-tight">
                            {view === 'menu' ? 'Command Matrix' : view === 'create-team' ? 'Init Unit' : view === 'manage-roster' ? 'Operative Matrix' : view === 'performance-tracker' ? 'Tactical Intel' : view === 'tournament-network' ? 'Tournament Network' : 'Victory Log'}
                        </h2>
                        <p className="text-[8px] md:text-[10px] text-amber-500 font-black uppercase tracking-[0.3em] md:tracking-[0.4em] mt-1 md:mt-2 md:ml-1">Secure Tactical Terminal</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="px-4 md:px-5 py-1.5 md:py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl md:rounded-2xl">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 whitespace-nowrap">Auth: Level 4 Manager</span>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-24 space-y-6">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 w-12 h-12 border-4 border-purple-500/10 border-b-purple-500 rounded-full animate-spin-slow" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Tactical Streams...</p>
                </div>
            )}

            {error && (
                <div className="mb-12 p-6 bg-red-500/5 border border-red-500/20 rounded-[32px] text-red-500 text-sm font-black uppercase tracking-widest text-center shadow-lg animate-in fade-in slide-in-from-top-4">
                    <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {error}
                    </span>
                </div>
            )}

            {view === 'menu' && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    {[
                        { id: 'create-team', icon: 'M12 4v16m8-8H4', title: 'Unit Initialization', desc: 'Draft new rosters and assign captains.', color: 'purple' },
                        { id: 'manage-roster', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Operative Matrix', desc: 'Sync rosters and monitor active squads.', color: 'amber' },
                        { id: 'tournament-network', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', title: 'Tournament Network', desc: 'Track and manage tournament operations.', color: 'indigo' },
                        { id: 'log-achievement', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', title: 'Victory Protocol', desc: 'Record a new tournament win.', color: 'yellow' },
                        { id: 'performance-tracker', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Tactical Analytics', desc: 'Track Win Rates, K/D, and Maps.', color: 'cyan' },
                        { id: 'scrim-ops', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', title: 'Scrim Network', desc: 'Schedule matches and analyze results.', color: 'emerald' }
                    ].map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'scrim-ops') {
                                    onNavigate && onNavigate('team-management');
                                } else if (item.id === 'tournament-network') {
                                    // Navigate to TeamManagement with tournament mode
                                    onNavigate && onNavigate('tournament-management');
                                } else {
                                    setView(item.id as any);
                                }
                            }}
                            className="bg-white dark:bg-black/40 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group shadow-xl relative overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 dark:bg-white/5 blur-[40px] rounded-full group-hover:bg-amber-500/10 transition-colors" />
                            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all shadow-xl">
                                <svg className="w-8 h-8 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                            </div>
                            <h3 className="text-xl font-black text-[var(--text-color)] mb-2 tracking-tight group-hover:text-amber-500 transition-colors uppercase">{item.title}</h3>
                            <p className="text-sm text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                            <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                Initialize Shell <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {view === 'performance-tracker' && (
                <div className="space-y-12 animate-in fade-in duration-700">
                    <TacticalIntelGraphs availableTeams={teams} />
                </div>
            )}

            {view === 'create-team' && (
                <form onSubmit={handleCreateTeam} className="space-y-6 md:space-y-8 max-w-2xl mx-auto bg-white dark:bg-black/40 p-6 md:p-12 rounded-[32px] md:rounded-[48px] border border-slate-200 dark:border-white/5 animate-in zoom-in duration-500" style={{ boxShadow: 'var(--card-shadow)' }}>
                    <div className="space-y-4 md:space-y-6">
                        <div>
                            <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Unit Designation</label>
                            <input type="text" required value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700" placeholder="e.g. VALORANT ALPHA" />
                        </div>
                        <div>
                            <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Combat Simulator</label>
                            <select required value={teamGame} onChange={e => setTeamGame(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer">
                                <option value="" className="bg-white dark:bg-[#020617]">-- SELECT TITLE --</option>
                                {GAME_TITLES.map(title => (
                                    <option key={title} value={title} className="bg-white dark:bg-[#020617]">{title.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Mission Parameters</label>
                            <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700" rows={4} placeholder="DEFINE OBJECTIVES..." />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 md:py-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-xs rounded-xl md:rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 border-t border-white/20">
                        Authorize Deployment
                    </button>
                </form>
            )}

            {view === 'log-achievement' && (
                <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-10">
                        <div className="text-center md:text-left w-full md:w-auto">
                            <h2 className="text-2xl md:text-4xl font-black text-[var(--text-color)] tracking-tight uppercase flex items-center justify-center md:justify-start">
                                <span className="bg-amber-500 text-black px-3 md:px-4 py-1 rounded-lg md:xl mr-3 md:mr-4 text-lg md:text-2xl font-black">NQ-01</span>
                                Victory Log
                            </h2>
                            <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mt-2 md:mt-3 md:ml-1 leading-relaxed">Live Tournament Results & Achievement Logging</p>
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto bg-white/40 dark:bg-black/40 backdrop-blur-3xl p-6 md:p-12 rounded-[32px] md:rounded-[48px] border border-slate-200 dark:border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
                        <AddAchievementForm />
                    </div>
                </div>
            )}

            {view === 'manage-roster' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                    <form onSubmit={handleAddPlayer} className="space-y-6 md:space-y-8 max-w-2xl mx-auto bg-white dark:bg-black/40 p-6 md:p-12 rounded-[32px] md:rounded-[48px] border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
                        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-color)] text-center mb-6 md:mb-10 tracking-tight uppercase">Operative Matrix</h2>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1 ml-2">Strategic Squad</label>
                                <div className="group">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="SEARCH SQUAD..."
                                            value={squadSearch}
                                            onChange={e => {
                                                setSquadSearch(e.target.value);
                                                setShowSquadResults(true);
                                            }}
                                            className={`w-full bg-slate-50/50 dark:bg-[#020617]/40 border border-slate-200 dark:border-white/10 ${((squadSearch && showSquadResults) || showSquadResults) ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'} px-6 py-3 text-[10px] font-black tracking-widest text-[var(--text-color)] focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSquadResults(!showSquadResults)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-amber-500 transition-colors"
                                        >
                                            <svg className={`w-4 h-4 transform transition-transform ${showSquadResults ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>
                                    {showSquadResults && (
                                        <select
                                            required
                                            value={selectedTeam}
                                            onChange={e => {
                                                const team = teams.find(t => t.id === Number(e.target.value));
                                                setSelectedTeam(e.target.value);
                                                setSquadSearch(team?.name || '');
                                                setShowSquadResults(false);
                                            }}
                                            className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-b-2xl px-6 py-4 text-[var(--text-color)] dark:text-white font-black tracking-tight focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                                            size={Math.min(teams.filter(t => t.name.toLowerCase().includes(squadSearch.toLowerCase())).length + 1, 5)}
                                        >
                                            <option value="" className="bg-white dark:bg-[#020617]">-- CHOOSE UNIT --</option>
                                            {teams
                                                .filter(t => t.name.toLowerCase().includes(squadSearch.toLowerCase()))
                                                .map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-[#020617]">{t.name.toUpperCase()}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {selectedTeam && (
                                <div className="p-6 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-200 dark:border-white/5 animate-in slide-in-from-top-4">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Current Active Roster</label>
                                    <div className="space-y-3">
                                        {teams.find(t => t.id === Number(selectedTeam))?.players?.map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                                                <div className="flex items-center space-x-3">
                                                    <img src={p.image || `https://ui-avatars.com/api/?name=${p.name}`} className="w-8 h-8 rounded-full border border-amber-500/20" alt={p.name} />
                                                    <span className="text-[11px] font-black text-[var(--text-color)] dark:text-white uppercase tracking-wider">{p.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePlayer(Number(selectedTeam), p.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Remove from roster"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {(!teams.find(t => t.id === Number(selectedTeam))?.players || (teams.find(t => t.id === Number(selectedTeam))?.players?.length === 0)) && (
                                            <p className="text-[10px] text-slate-500 font-bold text-center py-2 italic">No operatives currently assigned.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1 ml-2">Registered Personnel</label>
                                <div className="group">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="SEARCH BY NAME/USERNAME..."
                                            value={personnelSearch}
                                            onChange={e => {
                                                setPersonnelSearch(e.target.value);
                                                setShowPersonnelResults(true);
                                            }}
                                            className={`w-full bg-slate-50/50 dark:bg-[#020617]/40 border border-slate-200 dark:border-white/10 ${((personnelSearch && showPersonnelResults) || showPersonnelResults) ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'} px-6 py-3 text-[10px] font-black tracking-widest text-[var(--text-color)] focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPersonnelResults(!showPersonnelResults)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-amber-500 transition-colors"
                                        >
                                            <svg className={`w-4 h-4 transform transition-transform ${showPersonnelResults ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>
                                    {showPersonnelResults && (
                                        <select
                                            required
                                            value={selectedRosterUserId}
                                            onChange={e => {
                                                setSelectedRosterUserId(e.target.value);
                                                const u = usersList.find((u: any) => u.id === Number(e.target.value));
                                                if (u) {
                                                    setPlayerName(u.ign || u.username);
                                                    setPersonnelSearch(u.username);
                                                    setShowPersonnelResults(false);
                                                }
                                            }}
                                            className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-b-2xl px-6 py-4 text-[var(--text-color)] dark:text-white font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                                            size={Math.min(usersList.filter(u =>
                                                u.username.toLowerCase().includes(personnelSearch.toLowerCase()) ||
                                                (u.fullname && u.fullname.toLowerCase().includes(personnelSearch.toLowerCase())) ||
                                                (u.ign && u.ign.toLowerCase().includes(personnelSearch.toLowerCase()))
                                            ).length + 1, 5)}
                                        >
                                            <option value="" className="bg-white dark:bg-[#020617]">-- ACCESS DIRECTORY --</option>
                                            {usersList
                                                .filter(u =>
                                                    u.username.toLowerCase().includes(personnelSearch.toLowerCase()) ||
                                                    (u.fullname && u.fullname.toLowerCase().includes(personnelSearch.toLowerCase())) ||
                                                    (u.ign && u.ign.toLowerCase().includes(personnelSearch.toLowerCase()))
                                                )
                                                .map((u: any) => (
                                                    <option key={u.id} value={u.id} className="bg-white dark:bg-[#020617]">{u.ign ? `${u.ign.toUpperCase()} (@${u.username.toUpperCase()})` : `@${u.username.toUpperCase()}`}</option>
                                                ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 ml-2">Codename Confirmation</label>
                                <input type="text" readOnly value={playerName} className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-6 py-4 text-slate-500 font-black tracking-tight cursor-not-allowed uppercase" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-3 ml-2">Tactical Role</label>
                                <input
                                    type="text"
                                    required
                                    value={playerRole}
                                    onChange={e => setPlayerRole(e.target.value)}
                                    placeholder="TYPE TACTICAL ROLE..."
                                    className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-[var(--text-color)] dark:text-white font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full py-5 mt-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-[0.4em] text-xs rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 border-t border-white/20">
                            Authorize Assignment
                        </button>
                    </form>

                    {/* Integrated Squad Intelligence Registry */}
                    <div className="space-y-8 animate-in fade-in duration-700 mt-12 md:mt-20">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10 px-4 md:px-0">
                            <div className="text-center md:text-left w-full md:w-auto">
                                <h2 className="text-2xl md:text-3xl font-black text-[var(--text-color)] tracking-tight uppercase flex items-center justify-center md:justify-start">
                                    <span className="bg-amber-500 text-black px-3 md:px-4 py-1 rounded-lg md:xl mr-4 text-lg md:text-xl font-black">NQ-01</span>
                                    Squad Intelligence
                                </h2>
                                <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mt-2 md:mt-3 leading-relaxed">Live Asset Deployment & Monitoring</p>
                            </div>
                            <div className="relative group w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="FILTER UNITS..."
                                    value={squadSearch}
                                    onChange={e => setSquadSearch(e.target.value)}
                                    className="w-full md:w-64 pl-12 pr-6 py-3 md:py-4 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-color)] focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-xl"
                                />
                                <svg className="w-4 h-4 text-amber-500/60 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>

                        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl rounded-[24px] md:rounded-[48px] border border-slate-200 dark:border-white/5 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
                            <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white/80 dark:bg-[#0d0d14]/80 backdrop-blur-md z-10">
                                        <tr className="border-b border-slate-200 dark:border-white/5">
                                            <th className="px-6 md:px-8 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Designation</th>
                                            <th className="px-6 md:px-8 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Simulator</th>
                                            <th className="px-6 md:px-8 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Operatives</th>
                                            <th className="px-6 md:px-8 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                        {teams.filter(t => t.name.toLowerCase().includes(squadSearch.toLowerCase())).map((team) => (
                                            <tr
                                                key={team.id}
                                                onClick={() => setSelectedSquadForModal(team)}
                                                className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all cursor-pointer"
                                            >
                                                <td className="px-6 md:px-8 py-4 md:py-6">
                                                    <div className="flex items-center space-x-3 md:space-x-4">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black text-[10px] md:text-xs border border-amber-500/20 group-hover:scale-110 transition-transform">
                                                            {team.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] md:text-sm font-black text-[var(--text-color)] dark:text-white uppercase tracking-tight whitespace-nowrap">{team.name}</p>
                                                            <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Unit ID: {team.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 md:px-8 py-4 md:py-6">
                                                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[8px] md:text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-white/10 whitespace-nowrap">
                                                        {team.game}
                                                    </span>
                                                </td>
                                                <td className="px-6 md:px-8 py-4 md:py-6">
                                                    <div className="flex justify-center -space-x-2 md:-space-x-3">
                                                        {(team as any).players?.slice(0, 3).map((p: any, i: number) => (
                                                            <img
                                                                key={i}
                                                                src={p.image || `https://ui-avatars.com/api/?name=${p.name}`}
                                                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white dark:border-[#0d0d14] object-cover ring-2 ring-amber-500/10"
                                                                title={p.name}
                                                                alt={p.name}
                                                            />
                                                        ))}
                                                        {(team as any).players?.length > 3 && (
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border-2 border-white dark:border-[#0d0d14] flex items-center justify-center text-[8px] md:text-[10px] font-black text-white ring-2 ring-amber-500/10">
                                                                +{(team as any).players.length - 3}
                                                            </div>
                                                        )}
                                                        {(!(team as any).players || (team as any).players?.length === 0) && (
                                                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest italic whitespace-nowrap">Empty</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                                                    <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
                                                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Squad Detail Modal */}
            <Modal isOpen={!!selectedSquadForModal} onClose={() => setSelectedSquadForModal(null)} zIndex={100} backdropClassName="bg-white/10 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" className="w-full max-w-4xl">
                {selectedSquadForModal && <div className="relative w-full max-w-4xl bg-white/90 dark:bg-[#0d0d14]/90 backdrop-blur-2xl rounded-[48px] border border-slate-200 dark:border-white/10 shadow-[0_64px_128px_-32px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                    {/* Modal Header */}
                    <div className="p-6 md:p-10 border-b border-slate-200 dark:border-white/5 flex justify-between items-center relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
                        <div className="text-left">
                            <h2 className="text-xl md:text-3xl font-black text-[var(--text-color)] dark:text-white uppercase tracking-tight flex items-center gap-3 md:gap-4">
                                <span className="bg-amber-500 text-black px-2 md:px-3 py-0.5 md:py-1 rounded-md md:lg text-sm md:text-lg leading-none">UNIT</span>
                                {selectedSquadForModal.name}
                            </h2>
                            <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mt-2 md:mt-3 leading-relaxed">{selectedSquadForModal.game} // Operational Roster Overview</p>
                        </div>
                        <button
                            onClick={() => setSelectedSquadForModal(null)}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-amber-500 hover:scale-110 transition-all border border-slate-200 dark:border-white/10 ml-4 shrink-0"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 md:p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {selectedSquadForModal.players?.map((p: any) => (
                                <div key={p.id} className="group/player p-4 md:p-6 bg-slate-50 dark:bg-white/5 rounded-[24px] md:rounded-[32px] border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between gap-4">
                                    <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
                                        <div className="relative shrink-0">
                                            <img
                                                src={p.image || `https://ui-avatars.com/api/?name=${p.name}`}
                                                className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover ring-2 md:ring-4 ring-amber-500/10 shadow-xl group-hover/player:scale-105 transition-transform"
                                                alt={p.name}
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0d0d14]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm md:text-lg font-black text-[var(--text-color)] dark:text-white uppercase tracking-tight leading-none mb-1 truncate">{p.name}</p>
                                            <p className="text-[8px] md:text-[10px] text-amber-500 font-black uppercase tracking-widest truncate">{p.role || 'Unassigned Role'}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleRemovePlayer(selectedSquadForModal.id, p.id);
                                            // Update local modal state after removal
                                            const res = await fetch(userRole === 'manager' && userId
                                                ? `${import.meta.env.VITE_API_BASE_URL}/api/teams?managerId=${userId}`
                                                : `${import.meta.env.VITE_API_BASE_URL}/api/teams`);
                                            const result = await res.json();
                                            if (result.success) {
                                                setTeams(result.data);
                                                const updatedSquad = result.data.find((t: any) => t.id === selectedSquadForModal.id);
                                                if (updatedSquad) setSelectedSquadForModal(updatedSquad);
                                            }
                                        }}
                                        className="px-3 md:px-5 py-1.5 md:py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg md:xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20 group-hover/player:scale-105 shrink-0"
                                    >
                                        Out
                                    </button>
                                </div>
                            ))}
                            {(!selectedSquadForModal.players || selectedSquadForModal.players.length === 0) && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[40px]">
                                    <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.5em]">Unit strength at zero capacity</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 md:p-10 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500" />
                                Strength: {selectedSquadForModal.players?.length || 0} Ops
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span>Status: Combat Ready</span>
                        </div>
                        <div className="text-amber-500/60 text-center md:text-right">
                            Tactical Unit Deployment Dashboard
                        </div>
                    </div>
                </div>}
            </Modal>
        </div >
    );
};

export default ManagerDashboard;
