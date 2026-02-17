
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTeamAnalysis } from '../services/geminiService';

const chartData = [
  { date: '24 Aug', winRate: 65, practiceHours: 8 },
  { date: '31 Aug', winRate: 72, practiceHours: 10 },
  { date: '7 Sept', winRate: 68, practiceHours: 12 },
  { date: '14 Sept', winRate: 85, practiceHours: 9 },
  { date: '21 Sept', winRate: 78, practiceHours: 11 },
  { date: '28 Sept', winRate: 92, practiceHours: 14 },
];

const stats = [
  { label: 'Scrims Won', value: '82%', color: 'bg-pink-500' },
  { label: 'Practice Uptime', value: '96%', color: 'bg-white' },
  { label: 'Tactical Drift', value: '12%', color: 'bg-slate-600' },
  { label: 'Reports', value: '15', color: 'bg-slate-500' }
];

const Dashboard: React.FC = () => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await getTeamAnalysis({
      winRate: "92%",
      practiceHours: "14h daily",
      rosterHealth: "Optimal",
      tournamentStatus: "Grand Finals"
    });
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="w-full bg-[#0d0d14] rounded-3xl border border-white/5 shadow-3xl overflow-hidden">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between p-6 bg-[#161621]/50 border-b border-white/5">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-lg">Nova Nexus.io</span>
          <div className="hidden sm:flex bg-white/5 rounded-full p-1 space-x-1">
            <button className="px-4 py-1 text-xs font-semibold bg-white/10 rounded-full">Overview</button>
            <button className="px-4 py-1 text-xs font-semibold text-slate-500 hover:text-white transition-colors">Tournaments</button>
            <button className="px-4 py-1 text-xs font-semibold text-slate-500 hover:text-white transition-colors">Metrics</button>
            <button className="px-4 py-1 text-xs font-semibold text-slate-500 hover:text-white transition-colors">History</button>
            <button className="px-4 py-1 text-xs font-semibold text-slate-500 hover:text-white transition-colors">Teams</button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 overflow-hidden ring-2 ring-white/10">
            <img src="https://picsum.photos/seed/admin/100" alt="Profile" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-medium text-slate-400">Welcome in, <span className="text-white font-bold">Commander</span></h2>
            <div className="flex flex-wrap gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white/5 rounded-2xl p-4 min-w-[140px] border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">{stat.value}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${stat.color} shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-8">
            <div className="text-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-bold">38</span>
                <span className="text-green-500 text-xs">▲</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Wins</p>
            </div>
            <div className="text-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-bold">26</span>
                <span className="text-blue-500 text-xs">▲</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Training Days</p>
            </div>
            <div className="text-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-bold">103</span>
                <span className="text-pink-500 text-xs">▲</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Clutch Plays</p>
            </div>
          </div>
        </div>

        {/* Charts & Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-[#161621] rounded-3xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Performance Frequency</h3>
              <div className="flex bg-white/5 rounded-lg p-1 text-[10px] font-bold">
                <button className="px-3 py-1 bg-white/10 rounded-md">12 months</button>
                <button className="px-3 py-1 text-slate-500">30 days</button>
                <button className="px-3 py-1 text-slate-500">1 week</button>
              </div>
            </div>
            
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPractice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#475569', fontSize: 10}} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0d0d14', border: '1px solid #ffffff10', borderRadius: '12px'}}
                    itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorWin)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="practiceHours" 
                    stroke="#ec4899" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorPractice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-blue-600 rounded-3xl p-6 relative overflow-hidden group cursor-pointer">
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/></svg>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Tactical AI</h3>
              <p className="text-xs leading-relaxed opacity-80 mb-6">
                Analyzing scrimmage data from previous splits to optimize rotation patterns and objective control.
              </p>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 bg-white text-blue-600 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? "Processing Data..." : "Run AI Analysis"}
              </button>
            </div>

            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex-grow">
               {aiAnalysis ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="flex items-center space-x-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Report</span>
                   </div>
                   <p className="text-sm text-slate-300 italic leading-relaxed">
                     "{aiAnalysis}"
                   </p>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                   <svg className="w-10 h-10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   <p className="text-xs font-bold uppercase tracking-tighter">Standby for AI Directive</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
