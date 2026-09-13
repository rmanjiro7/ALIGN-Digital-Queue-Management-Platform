import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Clock, 
  Radio, 
  Sparkles, 
  Building2, 
  ChevronRight, 
  CheckCircle2,
  Tv,
  ArrowRight,
  Maximize2,
  ArrowLeft
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { wsClient } from '../../services/websocketClient';

interface Screen22PublicDisplayProps {
  appState: AppState;
}

export const Screen22PublicDisplay: React.FC<Screen22PublicDisplayProps> = ({ appState }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const locationId = appState.currentUser?.locationId;
    if (!locationId) return;

    wsClient.connect(
      () => {
        // 1. Subscribe to Location Stream
        wsClient.subscribeToLocation(locationId, (msg) => {
          queueStore.handleRealtimeEvent(msg, locationId);
        });

        // 2. Start Sync Cycle
        const genId = queueStore.startSyncCycle(locationId);

        // 3. Fetch Snapshot
        apiClient.authenticatedFetch(`/api/v1/locations/${locationId}/queue-snapshot`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Snapshot fetch failed');
          })
          .then(snapshot => {
            // 4. Apply Snapshot
            queueStore.applySnapshot(snapshot, genId, locationId);
          })
          .catch(err => {
            console.error('[Snapshot] Failed:', err);
            queueStore.setSyncStatus('ERROR');
          });
      },
      () => {
        queueStore.setSyncStatus('RECONNECTING');
      },
      (err) => {
        console.error('[STOMP] Error', err);
        queueStore.setSyncStatus('ERROR');
      }
    );

    return () => {
      wsClient.disconnect();
      queueStore.setSyncStatus('DISCONNECTED');
    };
  }, [appState.currentUser?.locationId]);

  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  // Find currently called/serving token across all counters (most recently called token)
  const activeServingTokens = appState.tokens.filter(
    t => (t.state === 'CALLED' || t.state === 'IN_SERVICE') &&
         (!appState.selectedOrgId || t.orgId === appState.selectedOrgId)
  );

  let activeCalledToken = null as (typeof appState.tokens)[0] | null;

  if (appState.lastCalledTokenId) {
    const explicitToken = activeServingTokens.find(t => t.id === appState.lastCalledTokenId);
    if (explicitToken) {
      activeCalledToken = explicitToken;
    }
  }

  if (!activeCalledToken && activeServingTokens.length > 0) {
    const sorted = [...activeServingTokens].sort((a, b) => {
      const counterA = appState.counters.find(c => c.currentServingTokenId === a.id || c.number === a.counterNumber);
      const counterB = appState.counters.find(c => c.currentServingTokenId === b.id || c.number === b.counterNumber);

      const timeA = Math.max(
        a.calledAt ? new Date(a.calledAt).getTime() : 0,
        a.servedAt ? new Date(a.servedAt).getTime() : 0,
        counterA?.serviceStartTime ? new Date(counterA.serviceStartTime).getTime() : 0
      );
      const timeB = Math.max(
        b.calledAt ? new Date(b.calledAt).getTime() : 0,
        b.servedAt ? new Date(b.servedAt).getTime() : 0,
        counterB?.serviceStartTime ? new Date(counterB.serviceStartTime).getTime() : 0
      );
      return timeB - timeA;
    });
    activeCalledToken = sorted[0] || null;
  }

  const assignedCounterNumber = activeCalledToken
    ? (appState.counters.find(c => c.currentServingTokenId === activeCalledToken!.id || c.number === activeCalledToken!.counterNumber)?.number ?? activeCalledToken.counterNumber ?? 1)
    : null;

  const upcomingTokens = appState.tokens
    .filter(t => t.orgId === appState.selectedOrgId && 
                 t.locationId === appState.selectedLocationId && 
                 t.state === 'WAITING')
    .slice(0, 4);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-[92vh] bg-[#0F172A] text-white flex flex-col justify-between p-4 md:p-8 font-sans select-none overflow-hidden relative">
      {/* Subtle background ambient lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00ACC1]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#00ACC1]/10 rounded-full blur-3xl pointer-events-none" />

      {/* TV Header Bar */}
      <div className="relative z-10 flex items-center justify-between pb-6 border-b border-slate-700/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#00ACC1] flex items-center justify-center font-black text-[#0F172A] text-2xl shadow-lg">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-wider text-xl text-white">ALIGN</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#00ACC1]/20 text-[#00ACC1] font-mono font-bold border border-[#00ACC1]/30">
                PUBLIC MONITOR
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-[#00ACC1]" />
              <span>{currentOrg.name} — {currentLocation.name} ({currentLocation.subtitle})</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Fullscreen / Exit toggle */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl md:text-3xl font-black font-mono tracking-wider text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-[#1E293B] hover:bg-slate-700 text-[#00ACC1] rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            title="Toggle TV Fullscreen Mode"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              queueStore.setRole('CUSTOMER');
              queueStore.setScreen('SCREEN_02_DISCOVERY');
            }}
            className="flex items-center gap-1.5 px-4 py-3 bg-[#1E293B] hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Exit Public TV Mode"
          >
            <ArrowLeft className="w-4 h-4 text-[#00ACC1]" />
            <span className="hidden sm:inline">Exit Display</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen: Giant Now Serving on Left, Next in Line on Right */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 flex-1 items-center">
        {/* Left 7 Cols: Massive NOW SERVING Hero Card & Multi-Counter Grid */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-[#1E293B] rounded-3xl p-8 md:p-12 border-2 border-[#00ACC1] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Animated Glow Halo */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#00ACC1]/10 to-transparent pointer-events-none" />

            {activeCalledToken ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-sm font-mono uppercase tracking-widest text-[#00ACC1] font-bold">
                    NOW SERVING
                  </span>
                </div>

                {/* Huge Token Typography */}
                <div className="text-8xl md:text-9xl font-black font-mono tracking-tight text-white my-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                  {activeCalledToken.tokenNumber}
                </div>

                {/* Target Counter Destination */}
                <div className="w-full max-w-lg bg-[#0F172A] p-5 rounded-2xl border border-slate-700 mt-2">
                  <div className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold mb-1">
                    PLEASE PROCEED TO
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-[#00ACC1] tracking-tight">
                    COUNTER {assignedCounterNumber || activeCalledToken.counterNumber || 1}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-mono">
                    {appState.services.find(s => s.id === activeCalledToken.serviceId)?.name || 'General Inquiry & Account Services'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  <span className="text-sm font-mono uppercase tracking-widest text-slate-400 font-bold">
                    SERVICE DESKS READY
                  </span>
                </div>

                <div className="text-7xl font-black font-mono tracking-tight text-slate-500 my-4">
                  READY
                </div>

                <div className="w-full max-w-lg bg-[#0F172A] p-5 rounded-2xl border border-slate-700 mt-2">
                  <div className="text-sm text-slate-300 font-medium">
                    Please take a queue token and wait for your number to be called.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Multi-Counter Status Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {appState.counters.map(counter => {
              const qState = queueStore.getCounterQueueState(counter.number);
              const servingToken = counter.currentServingTokenId
                ? appState.tokens.find(t => t.id === counter.currentServingTokenId && ['CALLED', 'IN_SERVICE'].includes(t.state))
                : appState.tokens.find(t => t.counterNumber === counter.number && ['CALLED', 'IN_SERVICE'].includes(t.state));

              return (
                <div 
                  key={counter.id}
                  className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    servingToken
                      ? 'bg-[#1E293B] border-[#00ACC1] shadow-md'
                      : 'bg-[#0F172A]/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
                    <span>COUNTER {counter.number}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      counter.availability === 'ONLINE' ? 'bg-emerald-400' :
                      counter.availability === 'ON_BREAK' ? 'bg-amber-400' :
                      counter.availability === 'AWAY' ? 'bg-yellow-400' : 'bg-slate-500'
                    }`} />
                  </div>
                  <div className="mt-1">
                    {servingToken ? (
                      <div className="text-xl font-mono font-black text-[#00ACC1]">
                        {servingToken.tokenNumber}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-slate-500 font-bold uppercase">
                        {counter.availability === 'ONLINE' ? 'READY' : counter.availability.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Next in Line Queue Column */}
        <div className="lg:col-span-5 bg-[#1E293B]/80 rounded-3xl p-6 md:p-8 border border-slate-700 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
              <h2 className="text-base font-extrabold text-white tracking-wider flex items-center gap-2">
                <span className="text-[#00ACC1] font-black">|</span>
                <span>NEXT IN LINE</span>
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-[#0F172A] text-[#00ACC1] border border-slate-700 font-bold">
                {upcomingTokens.length} UPCOMING
              </span>
            </div>

            {/* Upcoming token cards */}
            <div className="space-y-3">
              {upcomingTokens.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-mono text-xs">
                  All waiting tokens have been called.
                </div>
              ) : (
                upcomingTokens.map((tok, idx) => {
                  const srv = appState.services.find(s => s.id === tok.serviceId);
                  return (
                    <div 
                      key={tok.id}
                      className="p-4 bg-[#0F172A] rounded-2xl border border-slate-700 flex items-center justify-between shadow-inner"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#1E293B] text-[#00ACC1] flex items-center justify-center font-mono font-black text-xl border border-slate-700">
                          {tok.tokenNumber}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">
                            {srv?.name || 'General Inquiry'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            Est. Wait: {tok.estRange}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-[#00ACC1]">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Audio Chime Notification Banner */}
          <div className="mt-4 p-3.5 bg-[#0F172A] rounded-2xl border border-slate-700 flex items-center gap-3 text-xs text-slate-300">
            <Volume2 className="w-4 h-4 text-[#00ACC1] shrink-0 animate-pulse" />
            <span>Audio chimes and announcements broadcast on each token update.</span>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="relative z-10 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Please proceed to the counter when your number is called.</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>ALIGN Public Display v1.0</span>
          <span>•</span>
          <span className="text-[#00ACC1] font-bold">Zero-Latency WebSocket Engine</span>
        </div>
      </div>
    </div>
  );
};
