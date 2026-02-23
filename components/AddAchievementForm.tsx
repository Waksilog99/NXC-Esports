import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { GAME_TITLES } from './constants';

const AddAchievementForm: React.FC = () => {
    const { showNotification } = useNotification();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [placement, setPlacement] = useState('');
    const [game, setGame] = useState('');
    const [image, setImage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/achievements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, date, description, placement, image, game })
            });
            const result = await res.json();
            if (result.success) {
                showNotification({
                    message: 'Achievement Logged Successfully!',
                    type: 'success'
                });
                setTitle(''); setDate(''); setDescription(''); setPlacement(''); setImage(''); setGame('');
            } else {
                showNotification({
                    message: result.error || 'Failed to log achievement.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error(error);
            showNotification({
                message: 'Error connecting to server.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Achievement Title</label>
                <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    placeholder="e.g. WINTER SPLIT CHAMPIONS"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Protocol Date & Time</label>
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all [color-scheme:dark]"
                    />
                </div>
                <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Final Placement</label>
                    <input
                        type="text"
                        value={placement}
                        onChange={e => setPlacement(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                        placeholder="e.g. 1ST PLACE"
                    />
                </div>
            </div>
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Combat Simulator</label>
                <select
                    value={game}
                    onChange={e => setGame(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                >
                    <option value="" className="bg-white dark:bg-[#020617]">-- GLOBAL ARCHIVE --</option>
                    {GAME_TITLES.map(title => (
                        <option key={title} value={title} className="bg-white dark:bg-[#020617]">{title.toUpperCase()}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Mission Briefing</label>
                <textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    rows={4}
                    placeholder="DEFINE VICTORY PARAMETERS..."
                />
            </div>
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Intelligence Asset URL (Optional)</label>
                <input
                    type="text"
                    value={image}
                    onChange={e => setImage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    placeholder="https://..."
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 md:py-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-xs rounded-xl md:rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 border-t border-white/20"
            >
                {loading ? 'Processing...' : 'Authorize Victory Log'}
            </button>
        </form>
    );
};

export default AddAchievementForm;
