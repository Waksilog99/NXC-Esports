
import React from 'react';

const players = [
  { name: 'Xenon', role: 'Duelist', kda: '2.4', win: '78%', img: 'https://picsum.photos/seed/xenon/300/400' },
  { name: 'Aura', role: 'Initiator', kda: '1.9', win: '82%', img: 'https://picsum.photos/seed/aura/300/400' },
  { name: 'Cipher', role: 'Sentinel', kda: '3.1', win: '65%', img: 'https://picsum.photos/seed/cipher/300/400' },
  { name: 'Ghost', role: 'Controller', kda: '1.5', win: '72%', img: 'https://picsum.photos/seed/ghost/300/400' }
];

const Roster: React.FC = () => {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold">The Roster</h2>
          <p className="text-slate-400">Our world-class Valorant squad. Hard-coded for precision.</p>
        </div>
        <button className="px-6 py-2 border border-white/10 rounded-full text-sm font-bold hover:bg-white/5 transition-colors">
          View All Stats
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {players.map((player, idx) => (
          <div key={idx} className="group relative rounded-3xl overflow-hidden bg-[#161621] border border-white/5 transition-transform hover:-translate-y-2">
            <div className="aspect-[3/4] overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
              <img src={player.img} alt={player.name} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">{player.role}</p>
                <h3 className="text-2xl font-black italic">{player.name}</h3>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">KDA</p>
                  <p className="text-sm font-bold">{player.kda}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Win Rate</p>
                  <p className="text-sm font-bold">{player.win}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roster;
