import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { queueStore } from '../../services/store';

export const Screen01Splash: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            queueStore.setScreen('SCREEN_02_DISCOVERY');
          }, 400);
          return 100;
        }
        return prev + 20;
      });
    }, 180);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#0F172A] text-white p-6 relative overflow-hidden">
      {/* Subtle radial background glow */}
      <div className="absolute w-[600px] h-[600px] bg-[#00ACC1]/15 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[500px] h-[500px] bg-[#00ACC1]/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md bg-[#1E293B] rounded-3xl p-8 md:p-10 border border-slate-700 text-center shadow-2xl relative z-10 flex flex-col items-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#00ACC1] p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-[#0F172A] rounded-[14px] flex items-center justify-center">
              <span className="text-3xl font-black tracking-tighter text-[#00ACC1] italic">A</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#00ACC1] border-2 border-[#1E293B] flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-wider text-white mb-1">
          ALIGN
        </h1>
        <p className="text-xs font-mono text-[#00ACC1] tracking-widest uppercase mb-8 font-bold">
          DIGITAL QUEUE ECOSYSTEM
        </p>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-3 mb-8">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00ACC1] animate-pulse" />
              <span>INITIALIZING SYSTEM...</span>
            </span>
            <span className="text-[#00ACC1] font-bold">{progress}%</span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00ACC1] transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Multi-Tenant Node Connected</span>
          </div>
        </div>

        {/* Direct Skip Button */}
        <button
          id="splash-continue-btn"
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
          className="w-full py-4 px-6 rounded-2xl bg-[#00ACC1] hover:bg-[#0097A7] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00ACC1]/25 transition-all transform active:scale-98 cursor-pointer"
        >
          <span>Enter Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
