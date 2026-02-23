
import React, { useEffect } from 'react';

interface RocketLoaderProps {
    onComplete: () => void;
}

const RocketLoader: React.FC<RocketLoaderProps> = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3000); // 3 seconds animation

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617] text-center animate-in fade-in duration-300">
            {/* Stars background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="absolute top-3/4 left-1/3 w-1.5 h-1.5 bg-amber-200 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
                <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />

                {/* Speed lines */}
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent -translate-x-1/2 blur-[1px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Rocket Animation Container */}
                <div className="relative mb-8 text-8xl animate-bounce" style={{ animationDuration: '1s' }}>
                    <div className="animate-pulse">🚀</div>
                    {/* Engine Plume */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-16 bg-gradient-to-b from-orange-500 to-transparent blur-md -mt-2 animate-pulse" />
                </div>

                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2 animate-pulse">
                    Initiating Uplink
                </h2>
                <div className="flex items-center space-x-2 text-[10px] text-amber-500 font-bold uppercase tracking-[0.3em]">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                    <span>Establishing Secure Connection...</span>
                </div>
            </div>
        </div>
    );
};

export default RocketLoader;
