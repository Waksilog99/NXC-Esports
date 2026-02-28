import React, { useState, useEffect } from 'react';
import CheckoutModal from '@/components/CheckoutModal';
import MyOrdersModal from './MyOrdersModal';
import { useUser } from '../services/authService';
import { Product, Sponsor, CartItem } from './types';
import { GET_API_BASE_URL } from '../utils/apiUtils';


const StoreModal = ({ isOpen, onClose, onNeedLogin }: { isOpen: boolean; onClose: () => void; onNeedLogin: () => void }) => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'waks' | 'sponsor'>('waks');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<number | 'all'>('all');
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    // Modals State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartViewOpen, setIsCartViewOpen] = useState(false);
    const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
    const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
    const [isolationWarning, setIsolationWarning] = useState<string | null>(null);

    const addToCart = (product: Product) => {
        setCart(prev => {
            if (product.stock <= 0) {
                setIsolationWarning(`DEPLETED: This asset is currently out of stock and cannot be staged.`);
                setTimeout(() => setIsolationWarning(null), 4000);
                return prev;
            }

            if (prev.length > 0) {
                const currentBrandId = prev[0].product.sponsorId;
                if (product.sponsorId !== currentBrandId) {
                    setIsolationWarning(`STRICT BRAND ISOLATION: Your Arsenal already contains assets from ${currentBrandId === null ? 'Waks Corp' : 'another Sponsor'}. Procurement must be single-brand.`);
                    setTimeout(() => setIsolationWarning(null), 4000);
                    return prev;
                }
            }

            setIsolationWarning(null);
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: Math.min(item.product.stock, item.quantity + 1) }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, Math.min(item.product.stock, item.quantity + delta));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [prodRes, spRes] = await Promise.all([
                fetch(`${GET_API_BASE_URL()}/api/products`),
                fetch(`${GET_API_BASE_URL()}/api/sponsors`)
            ]);

            const prodData = await prodRes.json();
            const spData = await spRes.json();

            if (prodData.success) setProducts(prodData.data);
            if (spData.success) setSponsors(spData.data);

            if (!prodData.success || !spData.success) {
                setError("Protocol Breach: Failed to synchronize with supply servers.");
            }
        } catch (err) {
            console.error("Store fetch error:", err);
            setError("Comm Link Severed: Secure connection to supply depot failed.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen]);

    // Clear cart/store on logout
    useEffect(() => {
        if (!user) {
            setCart([]);
            setCheckoutProduct(null);
            setIsCartViewOpen(false);
            setIsMyOrdersOpen(false);
        }
    }, [user]);

    const waksProducts = products.filter(p => p.sponsorId === null);
    // Only display products for sponsors that are returned by the API (which now enforces the secondary role 'sponsor' check)
    const sponsorProducts = products.filter(p => p.sponsorId !== null && sponsors.some(s => s.id === p.sponsorId));

    // Distinct sponsor IDs for the dropdown
    const sponsorIds = Array.from(new Set(sponsorProducts.map(p => p.sponsorId)));

    const filteredSponsorProducts = selectedBrand === 'all'
        ? sponsorProducts
        : sponsorProducts.filter(p => p.sponsorId === selectedBrand);

    const renderProductList = (productList: Product[]) => {
        if (loading) {
            return (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-red-500 font-black uppercase tracking-widest text-sm mb-2">Connection Error</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-xs mb-6">{error}</p>
                    <button
                        onClick={fetchData}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
                    >
                        Retry Connection
                    </button>
                </div>
            );
        }

        if (productList.length === 0) {
            return (
                <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
                    No Merchandise Available in this sector.
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {productList.map((product, index) => {
                    const isOutOfStock = product.stock <= 0;
                    const canViewAndBuy = !isOutOfStock || user?.role === 'admin';

                    if (isOutOfStock && user?.role !== 'admin') {
                        return (
                            <div key={product.id} className="bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5 opacity-40 grayscale relative group animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both" style={{ animationDelay: `${index * 150}ms` }}>
                                <div className="aspect-square relative overflow-hidden">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                        <span className="text-white text-[10px] font-black uppercase tracking-[0.3em] border border-white/20 px-4 py-2 rounded-full">Depleted</span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-white/50 font-bold uppercase text-xs tracking-wider">{product.name}</h3>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={product.id} className={`bg-white/[0.03] backdrop-blur-xl rounded-[32px] overflow-hidden border border-white/10 transition-all duration-500 group flex flex-col shadow-2xl relative ${isOutOfStock ? 'opacity-60 grayscale-[0.5]' : ''} animate-in fade-in zoom-in slide-in-from-bottom-8 duration-700 fill-mode-both hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(245,158,11,0.3)] hover:border-amber-500/40`} style={{ animationDelay: `${index * 150}ms` }}>
                            {/* Accent Glow */}
                            {!isOutOfStock && <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full group-hover:bg-amber-500/10 transition-all duration-700" />}

                            <div className="relative aspect-square overflow-hidden bg-black/20">
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />

                                {/* Status Badge */}
                                <div className="absolute top-4 left-4 flex flex-col gap-2">
                                    {isOutOfStock && (
                                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                                            Admin View: 0 Stock
                                        </div>
                                    )}
                                </div>

                                {/* Price Tag */}
                                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                                    <span className="text-amber-500 font-black tracking-widest text-xs">
                                        ₱{(product.price / 100).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 flex flex-col flex-1 relative z-10">
                                <div className="mb-4">
                                    <h3 className="text-white font-black italic tracking-tighter uppercase text-xl leading-tight mb-2 group-hover:text-amber-400 transition-colors">{product.name}</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 font-medium">{product.description}</p>
                                </div>

                                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] uppercase font-black tracking-[0.2em] mb-1 ${isOutOfStock ? 'text-red-500' : 'text-slate-500'}`}>Availability</span>
                                        <span className={`text-xs font-bold ${isOutOfStock ? 'text-red-400' : 'text-white'}`}>{product.stock} Units</span>
                                    </div>
                                    <button
                                        onClick={() => !isOutOfStock && addToCart(product)}
                                        disabled={isOutOfStock}
                                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 group/btn relative overflow-hidden ${isOutOfStock
                                            ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                                            : 'bg-amber-500 hover:bg-amber-400 text-black hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] active:translate-y-0 shadow-amber-500/20'}`}
                                    >
                                        {!isOutOfStock && (
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                                        )}
                                        <svg className={`w-3.5 h-3.5 relative z-10 transition-transform duration-300 ${!isOutOfStock && 'group-hover/btn:scale-110 group-hover/btn:-rotate-12'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {isOutOfStock ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                                            )}
                                        </svg>
                                        <span className="relative z-10">
                                            {isOutOfStock ? 'Depleted' : 'Stage Asset'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCartView = () => {
        if (cart.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 opacity-20">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Arsenal Empty</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Deploy some assets before proceeding.</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 slide-in-from-right-4 duration-500 fill-mode-both">
                <div className="space-y-4">
                    {cart.map((item, index) => (
                        <div key={item.product.id} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 group hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_10px_20px_-10px_rgba(245,158,11,0.2)] transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
                            <img src={item.product.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-white/5" />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-white font-black uppercase text-xs truncate">{item.product.name}</h4>
                                <p className="text-amber-500 font-black text-[10px]">₱{(item.product.price / 100).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center bg-black/40 rounded-xl px-2 border border-white/5">
                                <button onClick={() => updateQuantity(item.product.id, -1)} className="p-2 text-slate-500 hover:text-white transition-colors">-</button>
                                <span className="text-white font-black text-xs min-w-[2ch] text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.product.id, 1)} className="p-2 text-slate-500 hover:text-white transition-colors">+</button>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="p-3 text-slate-500 hover:text-red-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-6 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Logistics Total</span>
                        <span className="text-amber-500 font-black text-xl tracking-tighter shadow-amber-500/10 shadow-xl">₱{(cartTotal / 100).toLocaleString()}</span>
                    </div>
                    <button
                        onClick={() => {
                            if (!user) {
                                setIsolationWarning("AUTHENTICATION REQUIRED: Only registered members can checkout. Redirecting...");
                                setTimeout(() => {
                                    setIsolationWarning(null);
                                    onNeedLogin();
                                }, 2000);
                                return;
                            }
                            setCheckoutProduct(cart[0].product);
                            setIsCartViewOpen(false);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all shadow-[0_20px_40px_rgba(245,158,11,0.2)] active:scale-95"
                    >
                        Initiate Checkout
                    </button>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex justify-end p-4 sm:p-6 lg:p-8 pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity pointer-events-auto" onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#020617]/80 backdrop-blur-3xl border border-white/10 rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right-12 duration-700 ease-out pointer-events-auto overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full" />
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-amber-500 to-transparent z-50" />

                {/* Header */}
                <div className="border-b border-white/5 p-6 flex flex-col shrink-0 bg-[#0f172a]/50 backdrop-blur-xl relative z-40">
                    {isolationWarning && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-full max-w-md bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-500 flex items-center gap-3 z-[100]">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            {isolationWarning}
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                                <span className="w-2 h-2 bg-amber-500 animate-pulse rounded-full shadow-[0_0_10px_#fbbf24]" />
                                <span className="text-amber-500 text-[10px] uppercase font-black tracking-[0.4em]">Supply Depot</span>
                            </div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Tactical Store</h2>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => setIsCartViewOpen(!isCartViewOpen)}
                                className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${isCartViewOpen ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/30'}`}
                            >
                                <svg className={`w-4 h-4 ${isCartViewOpen ? 'text-black' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4m14 4h1a2 2 0 002-2v-5a2 2 0 00-2-2H3a2 2 0 00-2 2v5a2 2 0 002 2h1" /></svg>
                                <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Arsenal</span>
                                {cartCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black animate-in zoom-in duration-300 ${isCartViewOpen ? 'bg-black text-amber-500' : 'bg-amber-500 text-black'}`}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => { setIsMyOrdersOpen(true); setIsCartViewOpen(false); }}
                                className="group relative flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl transition-all"
                            >
                                <span className="text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest hidden sm:block">Logistics</span>
                                <div className="w-2 h-2 bg-slate-500 group-hover:bg-amber-500 rounded-full group-hover:animate-ping" />
                            </button>
                            <button
                                onClick={onClose}
                                className="group relative flex items-center justify-center bg-white/5 hover:bg-white/10 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 px-3 py-2 rounded-xl transition-all text-slate-400 hover:text-red-400"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 backdrop-blur-md">
                        <button
                            onClick={() => { setActiveTab('waks'); setIsCartViewOpen(false); }}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === 'waks' && !isCartViewOpen ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Waks Corp
                        </button>
                        <button
                            onClick={() => { setActiveTab('sponsor'); setIsCartViewOpen(false); }}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === 'sponsor' && !isCartViewOpen ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Sponsors
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10">
                    {isCartViewOpen ? (
                        renderCartView()
                    ) : activeTab === 'waks' ? (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both">
                            <p className="text-slate-400 text-xs mb-8 uppercase tracking-widest border-l-2 border-amber-500 pl-4 py-1">Official apparatus and merchandise utilized by our top tier operatives.</p>
                            {renderProductList(waksProducts)}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both">
                            <div className="flex flex-col mb-6 gap-2 border-l-2 border-purple-500 pl-4">
                                <p className="text-slate-400 text-xs uppercase tracking-widest py-1">Authorized gear from our strategic allied networks.</p>

                                <div className="relative mt-2">
                                    <select
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        className="appearance-none bg-[#020617] border border-white/20 rounded-xl px-6 py-3 pr-12 text-white text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-purple-500 cursor-pointer min-w-[200px]"
                                    >
                                        <option value="all">ALL BRANDS</option>
                                        {sponsorIds.map(id => {
                                            const sponsor = sponsors.find(s => s.id === id);
                                            return (
                                                <option key={id} value={id as number}>
                                                    {sponsor ? sponsor.name.toUpperCase() : `SPONSOR ID: ${id}`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            {renderProductList(filteredSponsorProducts)}
                        </div>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            {checkoutProduct && (
                <CheckoutModal
                    isOpen={!!checkoutProduct}
                    onClose={() => setCheckoutProduct(null)}
                    items={cart}
                    onRemoveItem={removeFromCart}
                    onSuccess={() => {
                        setCheckoutProduct(null);
                        setCart([]); // Clear cart on success
                    }}
                />
            )}
            {/* My Orders Modal */}
            <MyOrdersModal
                isOpen={isMyOrdersOpen}
                onClose={() => setIsMyOrdersOpen(false)}
            />
        </div>
    );
};

export default StoreModal;
