import React, { useEffect, useState } from 'react';
import { queueStore } from '../../services/store';
import { PixelGridLoader } from '../common/PixelGridLoader';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f4] text-[#26251e] p-6 relative overflow-hidden select-none">
      <Card className="w-full max-w-md p-10 text-center flex flex-col items-center bg-white border border-[#e6e5e0] rounded-lg">
        {/* Anime.js Pixel Grid Emblem */}
        <div className="mb-6 flex flex-col items-center">
          <div className="p-4 rounded-lg bg-[#fafaf7] border border-[#efeee8] mb-4">
            <PixelGridLoader gridSize={3} pixelSize={14} gap={3} color="#f54e00" />
          </div>
          <h1 className="text-display-md tracking-tight text-[#26251e] uppercase">
            ALIGN
          </h1>
          <p className="text-[11px] font-mono text-[#807d72] tracking-[0.2em] uppercase mt-1">
            Digital Queue Platform
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-4 mb-8">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#807d72] uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <Icon icon="lucide:cpu" className="w-3.5 h-3.5 text-[#f54e00]" />
              <span>Node Initialization</span>
            </span>
            <span className="text-[#f54e00] font-semibold">{progress}%</span>
          </div>

          <div className="h-[2px] w-full bg-[#efeee8] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#f54e00] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#5a5852] uppercase tracking-wider">
            <Icon icon="lucide:shield-check" className="w-3.5 h-3.5 text-[#1f8a65]" />
            <span>Secure Connection Established</span>
          </div>
        </div>

        {/* Direct Skip Button */}
        <Button
          id="splash-continue-btn"
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
          variant="primary"
          className="w-full h-11 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2"
        >
          <span>Enter Platform</span>
          <Icon icon="lucide:arrow-right" className="w-4 h-4" />
        </Button>
      </Card>
    </div>
  );
};
