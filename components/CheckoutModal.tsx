import React, { useState } from 'react';
import Modal from './Modal';
import { useUser } from '../services/authService';
import { Product, CartItem } from './types';
import { GET_API_BASE_URL } from '../utils/apiUtils';


interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    onSuccess: () => void;
    onRemoveItem: (id: number) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, items, onSuccess, onRemoveItem }) => {
    const { user } = useUser();
    const [recipientName, setRecipientName] = useState(user?.fullname || '');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'E-Wallet' | 'Bank Transfer'>('E-Wallet');
    const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

    const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
    const [error, setError] = useState<string | null>(null);
    const [isProductOwnerWaks, setIsProductOwnerWaks] = useState(false);
    const [qrCodes, setQrCodes] = useState<{ eWallet: string | null; bank: string | null }>({ eWallet: null, bank: null });

    React.useEffect(() => {
        if (!isOpen || items.length === 0) return;

        const fetchQR = async () => {
            try {
                // For simplicity, we use the first item's owner for the QR code
                const prod = items[0].product;
                console.log("[CHECKOUT] Fetching QR for product:", prod.name, "SponsorID:", prod.sponsorId);

                if (!prod.sponsorId) {
                    setIsProductOwnerWaks(true);
                    const sRes = await fetch(`${GET_API_BASE_URL()}/api/site-settings`);
                    const sData = await sRes.json();
                    if (sData.success) {
                        console.log("[CHECKOUT] Waks settings fetched:", sData.data);
                        setQrCodes({
                            eWallet: sData.data.waksQrEWallet,
                            bank: sData.data.waksQrBank
                        });
                    }
                } else {
                    setIsProductOwnerWaks(false);
                    const spRes = await fetch(`${GET_API_BASE_URL()}/api/sponsors`);
                    const spData = await spRes.json();
                    if (spData.success) {
                        const sponsor = spData.data.find((s: any) => s.id === prod.sponsorId);
                        if (sponsor) {
                            console.log("[CHECKOUT] Sponsor found:", sponsor.name, "QRs:", !!sponsor.qrEWallet, !!sponsor.qrBank);
                            setQrCodes({
                                eWallet: sponsor.qrEWallet,
                                bank: sponsor.qrBank
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("[CHECKOUT] QR Sync Failure:", err);
                setError("Comm Link Failure: Failed to synchronize payment QR codes.");
            }
        };

        fetchQR();
    }, [isOpen, items]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProofUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    React.useEffect(() => {
        if (items.length === 0 && isOpen) {
            onClose();
        }
    }, [items, isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientName || !deliveryAddress || !contactNumber || !paymentProofUrl) {
            setError("All mission details and payment proof are required.");
            return;
        }

        setError(null);
        setStep('processing');

        try {
            const res = await fetch(`${GET_API_BASE_URL()}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id || 1,
                    items: items.map(item => ({
                        productId: item.product.id,
                        quantity: item.quantity
                    })),
                    recipientName,
                    deliveryAddress,
                    contactNumber,
                    paymentMethod,
                    paymentProofUrl
                })
            });

            const result = await res.json();

            if (result.success) {
                setStep('success');
            } else {
                setError(result.error || "Some assets could not be procured. Contact Command.");
                setStep('form');
            }
        } catch (err) {
            console.error("Order error:", err);
            setError("Secure connection to command failed.");
            setStep('form');
        }
    };

    const totalTally = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    return (
        <Modal isOpen={isOpen} onClose={step === 'processing' ? () => { } : onClose} zIndex={1200} backdropClassName="bg-[#020617]/90 backdrop-blur-2xl" className="w-full max-w-lg px-4 sm:px-0">
            <div className="bg-[#0f172a] rounded-[30px] border border-amber-500/30 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent z-50" />

                {step === 'form' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                        <div className="mb-8">
                            <span className="text-amber-500 text-[10px] uppercase font-black tracking-[0.4em] mb-2 block">Secure Checkout</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Asset Acquisition</h2>
                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[10px] font-bold group/item">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => onRemoveItem(item.product.id)}
                                                className="p-1 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover/item:opacity-100"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <span className="text-slate-400 uppercase truncate">{item.quantity}x {item.product.name}</span>
                                        </div>
                                        <span className="text-amber-500 font-black shrink-0">₱ {((item.product.price * item.quantity) / 100).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-white uppercase font-black tracking-widest text-[11px]">Total Logistics Tally</span>
                                    <span className="text-amber-500 font-black text-lg">₱ {(totalTally / 100).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 animate-in shake duration-500">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">Tactical Error Detected</p>
                                    <p className="text-white text-[10px] font-bold leading-tight mt-0.5 break-words">{error}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Operative / Recipient Name <span className="text-amber-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="e.g. Juan Dela Cruz"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Drop Point (Address) <span className="text-amber-500">*</span>
                                </label>
                                <textarea
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 focus:outline-none transition-colors resize-none h-24"
                                    placeholder="Enter full PH delivery coordinates..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Secure PH Comm Link (Contact) <span className="text-amber-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="+63 9XX XXX XXXX"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Payment Protocol</label>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('E-Wallet')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${paymentMethod === 'E-Wallet' ? 'bg-amber-500/10 text-amber-500 border-amber-500/50' : 'bg-[#020617] text-slate-500 border-white/10 hover:border-white/30'}`}
                                    >
                                        E-Wallet / GCash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('Bank Transfer')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${paymentMethod === 'Bank Transfer' ? 'bg-amber-500/10 text-amber-500 border-amber-500/50' : 'bg-[#020617] text-slate-500 border-white/10 hover:border-white/30'}`}
                                    >
                                        Bank Transfer
                                    </button>
                                </div>

                                {/* QR Code Display */}
                                <div className="bg-[#020617] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 mb-4 min-h-[160px]">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scan to Pay ({paymentMethod})</p>
                                    {paymentMethod === 'E-Wallet' ? (
                                        qrCodes.eWallet ? (
                                            <img
                                                key="qr-ewallet"
                                                src={qrCodes.eWallet}
                                                alt="E-Wallet QR"
                                                className="w-32 h-32 object-contain rounded-lg border border-white/20 animate-in fade-in zoom-in duration-300"
                                            />
                                        ) : (
                                            <div key="no-ewallet" className="w-32 h-32 bg-white/5 rounded-lg flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase text-center p-4 italic">Instruction: Contact Administrator for E-Wallet QR</div>
                                        )
                                    ) : (
                                        qrCodes.bank ? (
                                            <img
                                                key="qr-bank"
                                                src={qrCodes.bank}
                                                alt="Bank QR"
                                                className="w-32 h-32 object-contain rounded-lg border border-white/20 animate-in fade-in zoom-in duration-300"
                                            />
                                        ) : (
                                            <div key="no-bank" className="w-32 h-32 bg-white/5 rounded-lg flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase text-center p-4 italic">Instruction: Contact Administrator for Bank QR</div>
                                        )
                                    )}
                                </div>

                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Proof of Transaction <span className="text-amber-500">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="proof-upload"
                                    />
                                    <label
                                        htmlFor="proof-upload"
                                        className="w-full flex items-center justify-center gap-3 bg-[#020617] border border-white/10 hover:border-amber-500/50 rounded-xl px-4 py-3 cursor-pointer transition-all"
                                    >
                                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        <span className="text-white text-xs font-bold uppercase tracking-widest truncate max-w-[200px]">
                                            {paymentProofUrl ? "Tactical Intel Attached" : "Upload Screenshot"}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={onClose} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">Abort</button>
                                <button type="submit" className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]">Submit for Verification</button>
                            </div>
                        </form>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-500/10 border-b-purple-500 rounded-full animate-spin-slow" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black italic uppercase text-white tracking-widest">Processing Transaction</h3>
                            <p className="text-amber-500 text-[10px] uppercase tracking-[0.4em] animate-pulse">
                                {paymentMethod === 'E-Wallet' ? 'Verifying E-Wallet Link...' : 'Authorizing Card Protocol...'}
                            </p>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Do not abort connection.</p>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                            <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic uppercase text-white tracking-widest">Asset Secured</h3>
                            <p className="text-emerald-500 text-[10px] uppercase tracking-[0.3em]">Your order is being prepared for deployment.</p>
                        </div>
                        <button
                            onClick={onSuccess}
                            className="mt-6 px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all w-full"
                        >
                            Return to Depot
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};


export default CheckoutModal;
