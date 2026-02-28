import React, { useState, useEffect } from 'react';
import { useUser } from '../services/authService';
import { GET_API_BASE_URL } from '../utils/apiUtils';

interface Order {
    id: number;
    productId: number;
    recipientName: string;
    deliveryAddress: string;
    contactNumber: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

interface Product {
    id: number;
    name: string;
    imageUrl: string;
    price: number;
}

interface MyOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
    const { user } = useUser();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Record<number, Product>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [orderRes, prodRes] = await Promise.all([
                    fetch(`${GET_API_BASE_URL()}/api/orders?userId=${user.id}&requesterId=${user.id}`),
                    fetch(`${GET_API_BASE_URL()}/api/products`)
                ]);

                const orderData = await orderRes.json();
                const prodData = await prodRes.json();

                if (orderData.success) {
                    setOrders(orderData.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }

                if (prodData.success) {
                    const prodMap: Record<number, Product> = {};
                    prodData.data.forEach((p: Product) => {
                        prodMap[p.id] = p;
                    });
                    setProducts(prodMap);
                }

                if (!orderData.success || !prodData.success) {
                    setError("Signal Jammed: Failed to retrieve logistics data from command.");
                }
            } catch (err) {
                console.error("Failed to fetch user orders:", err);
                setError("Comm Link Lost: Secure connection to logistics server terminated.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, user]);

    if (!isOpen) return null;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'For Payment Verification': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Pending': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'For Shipping': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'Refunded': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-800 text-slate-400 border-white/10';
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
            <div className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-amber-500 text-[10px] uppercase font-black tracking-widest">Command Intelligence</span>
                        </div>
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">My Logistics Hub</h2>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Logistics Failure</p>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-xs">{error}</p>
                            </div>
                            <button onClick={() => window.location.reload()} className="text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 px-6 py-2 rounded-lg hover:bg-amber-500/10 transition-all">Retry Link</button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-50">
                            <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">No active deployments found</p>
                            <button onClick={onClose} className="text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 px-4 py-2 rounded-lg hover:bg-amber-500/10 transition-all">Procure Assets</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => {
                                const product = products[order.productId];
                                return (
                                    <div key={order.id} className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row gap-6 hover:border-amber-500/30 transition-all group">
                                        {/* Product Thumbnail */}
                                        <div className="w-full md:w-24 h-24 rounded-2xl border border-white/10 overflow-hidden shrink-0 bg-[#0f172a]">
                                            {product ? (
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse" />
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="text-white font-black italic uppercase tracking-wider text-lg">
                                                        {product?.name || `Product Asset #${order.productId}`}
                                                    </h4>
                                                    <span className="text-amber-500 font-mono text-[10px] font-bold">#ORD-{order.id.toString().padStart(4, '0')}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    <span>Recipient: {order.recipientName}</span>
                                                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                    <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)} shrink-0`}>
                                                        {order.status}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                                        QTY: {(order as any).quantity || 1}
                                                    </span>
                                                    {order.status === 'For Payment Verification' && (
                                                        <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-tighter animate-pulse">Waiting for Command verification</span>
                                                    )}
                                                </div>
                                                <div className="text-slate-400 font-bold text-sm tracking-tight">
                                                    ₱{(product ? (product.price * ((order as any).quantity || 1)) / 100 : 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-center space-x-3">
                    <svg className="w-4 h-4 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status updates are live. Contact tactical support for disputes.</p>
                </div>
            </div>
        </div>
    );
};

export default MyOrdersModal;
