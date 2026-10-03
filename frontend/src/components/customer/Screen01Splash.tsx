import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
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
    <div className="min-h-[100vh] flex items-center justify-center bg-base text-content-primary p-6 relative overflow-hidden select-none">
      <div className="w-full max-w-md bg-base rounded-none p-10 border border-border-subtle text-center flex flex-col items-center">
        {/* Brand Emblem */}
        <div className="mb-8">
          <div className="w-16 h-16 border border-border-strong rounded flex items-center justify-center mb-4 mx-auto">
            <span className="text-2xl font-semibold text-content-primary italic">A</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-wide text-content-primary uppercase mb-2">
            ALIGN
          </h1>
          <p className="text-[10px] font-mono text-content-secondary tracking-widest uppercase">
            Digital Queue System
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-4 mb-10">
          <div className="flex items-center justify-between text-[10px] font-mono text-content-muted uppercase tracking-widest px-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span>Initializing</span>
            </span>
            <span className="text-accent">{progress}%</span>
          </div>

          <div className="h-[2px] w-full bg-border-subtle rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-content-muted uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>Secure Node Connected</span>
          </div>
        </div>

        {/* Direct Skip Button */}
        <button
          id="splash-continue-btn"
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
          className="w-full py-4 px-6 bg-content-primary text-base font-semibold text-xs uppercase tracking-widest hover:bg-content-secondary transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Enter Platform</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
