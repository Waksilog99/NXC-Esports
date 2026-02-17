
import React from 'react';

const Header: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4">
      <div className="max-w-7xl w-full glass rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg flex items-center justify-center font-black text-white italic">
            N
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Nova Nexus.io</span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Games</a>
          <a href="#roster" className="hover:text-white transition-colors">Roster</a>
          <a href="#command-center" className="hover:text-white transition-colors">Command</a>
          <a href="#" className="hover:text-white transition-colors">Schedule</a>
          <a href="#" className="hover:text-white transition-colors">Nexus Pass</a>
        </div>

        <div className="flex items-center space-x-4">
          <button className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            Log in
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
