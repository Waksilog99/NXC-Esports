
import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative text-center space-y-8 pt-12 md:pt-20">
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-blue-400 mb-4 uppercase tracking-widest">
        <span>● Live: PCS Summer Split</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1]">
        Win <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">beyond</span> limits
      </h1>
      
      <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed font-light">
        The first truly AI-integrated esports organization. Real-time analytics, 
        automated scouting, and peak performance management for elite competitors.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-4">
        <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full font-bold text-white shadow-xl shadow-purple-600/20 hover:scale-105 transition-transform active:scale-95">
          Join the Org
        </button>
        <button className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold text-white hover:bg-white/10 transition-colors">
          Watch Reveal
        </button>
      </div>

      {/* Decorative stars/particles simulated with divs */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" />
        <div className="absolute top-40 left-[85%] w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-700" />
        <div className="absolute top-60 left-[20%] w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-1000" />
      </div>
    </div>
  );
};

export default Hero;
