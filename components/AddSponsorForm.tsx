import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';

interface AddSponsorFormProps {
    users: any[];
}

const AddSponsorForm: React.FC<AddSponsorFormProps> = ({ users }) => {
    const { showNotification } = useNotification();
    const [name, setName] = useState('');
    const [tier, setTier] = useState('Silver');
    const [userId, setUserId] = useState('');
    const [logo, setLogo] = useState('');
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/sponsors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, tier, logo, description, website, userId })
            });
            if (res.ok) {
                showNotification({
                    message: 'Partner Onboarded Successfully!',
                    type: 'success'
                });
                setName(''); setTier('Silver'); setLogo(''); setDescription(''); setWebsite(''); setUserId('');
            } else {
                showNotification({
                    message: 'Failed to add sponsor.',
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
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" placeholder="e.g. Apex Tech" />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Assign User Account</label>
                <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500">
                    <option value="">Select a user (optional)</option>
                    {users.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.username} ({u.fullname}) - {u.email}</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Selecting a user grants them access to the Sponsor Zone.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Classification</label>
                    <select value={tier} onChange={e => setTier(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500">
                        <option value="Platinum">Platinum (Tier 1)</option>
                        <option value="Gold">Gold (Tier 2)</option>
                        <option value="Silver">Silver (Tier 3)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
                    <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" placeholder="https://..." />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Logo URL</label>
                <input type="text" required value={logo} onChange={e => setLogo(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" placeholder="https://..." />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" rows={3} placeholder="Partnership details..." />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? 'Onboarding...' : 'Onboard Partner'}
            </button>
        </form>
    );
};

export default AddSponsorForm;
