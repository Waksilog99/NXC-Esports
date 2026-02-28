import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { GAME_TITLES } from './constants';
import { GET_API_BASE_URL } from '../utils/apiUtils';

const AddEventForm: React.FC<{ requesterId?: number }> = ({ requesterId }) => {
    const { showNotification } = useNotification();
    const [title, setTitle] = useState('');
    const [game, setGame] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${GET_API_BASE_URL()}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, game, date, location, description, image, requesterId })
            });
            if (res.ok) {
                showNotification({
                    message: 'Event Scheduled Successfully!',
                    type: 'success'
                });
                setTitle(''); setGame(''); setDate(''); setLocation(''); setDescription(''); setImage('');
            } else {
                showNotification({
                    message: 'Failed to schedule event.',
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
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 max-w-lg">
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Event Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700" placeholder="e.g. Grand Finals Watch Party" />
            </div>
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Strategic Game</label>
                <select value={game} onChange={e => setGame(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                    <option value="" className="bg-white dark:bg-[#020617]">Global Event / Mixed</option>
                    {GAME_TITLES.map(title => (
                        <option key={title} value={title} className="bg-white dark:bg-[#020617]">{title}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Protocol Date & Time</label>
                    <input type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-blue-500 dark:[color-scheme:dark]" />
                </div>
                <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Location</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700" placeholder="e.g. WC Arena / Online" />
                </div>
            </div>
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700" rows={3} placeholder="Event details and agenda..." />
            </div>
            <div>
                <label className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3 md:ml-2">Banner Image URL (Optional)</label>
                <input type="text" value={image} onChange={e => setImage(e.target.value)} className="w-full bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-black tracking-tight focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700" placeholder="https://..." />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 md:py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-xs rounded-xl md:rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 border-t border-white/20">
                {loading ? 'Scheduling...' : 'Authorize Schedule'}
            </button>
        </form>
    );
};

export default AddEventForm;
