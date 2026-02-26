import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { useUser, changePassword, deleteAccount } from '../services/authService';
import { useTheme } from '../hooks/useTheme';

const Settings: React.FC<{ onBack: () => void, userRole?: string }> = ({ onBack, userRole }) => {
    const { user } = useUser();
    const { theme, toggleTheme } = useTheme();
    const { showNotification } = useNotification();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePasswordChange = async () => {
        setSecurityMsg(null);
        if (!user?.id) return;
        try {
            await changePassword(Number(user.id), oldPass, newPass);
            setSecurityMsg({ type: 'success', text: 'Password updated successfully.' });
            setOldPass('');
            setNewPass('');
        } catch (e: any) {
            setSecurityMsg({ type: 'error', text: e.message });
        }
    };

    const handleDeleteAccount = async () => {
        if (!user?.id) return;
        if (confirm("Are you ABSOLUTELY sure? This action cannot be undone. All your data will be lost forever.")) {
            setIsDeleting(true);
            try {
                await deleteAccount(Number(user.id));
                showNotification({
                    message: "Account deleted. Goodbye.",
                    type: 'info'
                });
            } catch (e: any) {
                showNotification({
                    message: "Failed to delete: " + e.message,
                    type: 'error'
                });
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="animate-in fade-in zoom-in duration-700 pb-32">
            <button
                onClick={onBack}
                className="mb-12 flex items-center space-x-3 text-slate-500 hover:text-amber-500 transition-all group px-4 py-2 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/20 shadow-lg active:scale-95"
            >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{userRole === 'admin' || userRole === 'ceo' ? 'Return to Command' : 'Return to Citadel'}</span>
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">System Core Configurations</h1>
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.4em] mt-3 ml-1">Terminal ID://SECURE-WC-OPS-001</p>
                </div>
            </div>

            <div className="grid gap-12 relative z-10">
                {/* Visual Interface */}
                <section className="bg-[#020617]/40 backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-2xl p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full group-hover:bg-purple-500/10 transition-colors" />
                    <h3 className="text-xl font-black text-white mb-10 flex items-center uppercase tracking-tight">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 mr-4 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        Visual Interface Overrides
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-inner">
                        <div className="space-y-1">
                            <p className="text-lg font-black text-white italic tracking-tight uppercase">Luminance Calibration</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Toggle between Light and Dark command modes.</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative w-20 h-10 rounded-full transition-all duration-500 p-1.5 ${theme === 'dark' ? 'bg-[#020617] ring-1 ring-white/10' : 'bg-amber-100 ring-1 ring-amber-500/30'}`}
                        >
                            <div className={`w-7 h-7 rounded-lg shadow-2xl transition-all duration-500 flex items-center justify-center text-sm ${theme === 'dark' ? 'translate-x-10 bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-500/40' : 'translate-x-0 bg-gradient-to-br from-amber-400 to-yellow-600 shadow-amber-500/40 rotate-180'}`}>
                                {theme === 'dark' ? '🌙' : '☀️'}
                            </div>
                        </button>
                    </div>
                </section>

                {/* Security Protocol */}
                <section className="bg-[#020617]/40 backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-2xl p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full group-hover:bg-blue-500/10 transition-colors" />
                    <h3 className="text-xl font-black text-white mb-10 flex items-center uppercase tracking-tight">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 mr-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        Authentication Matrix
                    </h3>

                    <div className="space-y-8 max-w-2xl bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-inner">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Primary Cipher</label>
                                <input
                                    type="password"
                                    value={oldPass}
                                    onChange={(e) => setOldPass(e.target.value)}
                                    placeholder="CURRENT CODE"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black tracking-widest focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-[9px] placeholder:tracking-[0.2em]"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">New Sequence</label>
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    placeholder="MODIFIED CODE"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black tracking-widest focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-[9px] placeholder:tracking-[0.2em]"
                                />
                            </div>
                        </div>

                        {securityMsg && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${securityMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-[10px] font-black uppercase tracking-widest">{securityMsg.text}</span>
                            </div>
                        )}

                        <button
                            onClick={handlePasswordChange}
                            disabled={!oldPass || !newPass}
                            className="w-full px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 border-t border-white/20"
                        >
                            Commit Security Upgrade
                        </button>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-red-500/5 backdrop-blur-3xl rounded-[40px] border border-red-500/20 shadow-2xl p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full group-hover:bg-red-500/20 transition-colors" />
                    <h3 className="text-xl font-black text-red-500 mb-4 flex items-center uppercase tracking-tight">
                        <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 mr-4 border border-red-500/20">
                            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        Termination sequence
                    </h3>
                    <p className="text-slate-500 dark:text-red-200/40 mb-10 text-[10px] font-black uppercase tracking-[0.3em] ml-1">
                        Permanently remove your access and data from Waks Corporation. testing this action cannot be undone.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-8 py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl transition-all border border-red-500/30 active:scale-95 flex items-center gap-3 shadow-xl hover:shadow-red-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {isDeleting ? 'ERASING CORE...' : 'INITIATE TERMINATION'}
                    </button>
                </section>
            </div>
        </div>
    );
};

export default Settings;
