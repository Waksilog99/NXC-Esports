
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import Roster from './components/Roster';

const App: React.FC = () => {
  return (
    <div className="min-h-screen glow-mesh selection:bg-purple-500/30">
      {/* Background visual flair */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-pink-600/5 blur-[100px] rounded-full" />
      </div>

      <Header />
      
      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
        <Hero />
        
        <section id="command-center" className="scroll-mt-32">
          <Dashboard />
        </section>

        <section id="roster" className="scroll-mt-32">
          <Roster />
        </section>

        <footer className="pt-20 border-t border-white/5 text-center text-slate-500 text-sm">
          <div className="flex justify-center space-x-6 mb-8">
            <a href="#" className="hover:text-white transition-colors">X (Twitter)</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Twitch</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
          <p>© 2024 Nova Nexus Esports. All signals encrypted.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
