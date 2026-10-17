import React, { useState, useEffect } from 'react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { wsClient } from '../../services/websocketClient';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface Screen22PublicDisplayProps {
  appState: AppState;
}

export const Screen22PublicDisplay: React.FC<Screen22PublicDisplayProps> = ({ appState }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const enableAudio = () => {
      setAudioEnabled(true);
      if (!audioEnabled && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
    };
    
    window.addEventListener('click', enableAudio, { once: true });
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('click', enableAudio);
    };
  }, [audioEnabled]);

  useEffect(() => {
    const locationId = appState.currentUser?.locationId;
    if (!locationId) return;

    wsClient.connect(
      () => {
        // 1. Subscribe to Location Stream
        wsClient.subscribeToPublicLocation(appState.selectedOrgId, locationId, (msg) => {
          const wasProcessedLive = queueStore.handleRealtimeEvent(msg, locationId);
          if (wasProcessedLive && audioEnabled) {
            const type = msg.payload?.eventType || msg.eventType;
            if (type === 'TOKEN_CALLED' || type === 'TOKEN_RECALLED') {
              const tokenId = msg.payload?.tokenId || msg.tokenId;
              const token = queueStore.getState().tokens.find(t => t.id === tokenId);
              if (token) {
                const counterNumber = token.counterNumber || msg.payload?.counterNumber || msg.counterNumber || 1;
                queueStore.speakAnnouncementText(`Token ${token.tokenNumber}, please proceed to Counter ${counterNumber}.`);
              }
            }
          }
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
  }, [appState.currentUser?.locationId, audioEnabled, appState.selectedOrgId]);

  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

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
    .slice(0, 5);

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
    <div className="min-h-screen bg-[#141412] text-[#fafaf7] flex flex-col justify-between p-6 md:p-10 font-sans select-none overflow-hidden relative">
      {/* Mobile Notice */}
      <div className="lg:hidden relative z-10 mb-6 bg-[#26241e] border border-[#3d3a31] rounded-md p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon icon="lucide:tv" className="w-4 h-4 text-[#f54e00]" />
          <span className="text-xs font-mono font-medium text-[#f54e00] uppercase tracking-wider">Wallboard Display Mode</span>
        </div>
        <p className="text-xs text-[#a3a199] leading-relaxed">
          Optimized for large monitors. View in full screen for optimal queue presentation.
        </p>
      </div>

      {/* TV Header Bar */}
      <div className="relative z-10 flex items-center justify-between pb-6 border-b border-[#2e2c26]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-md bg-[#f54e00] flex items-center justify-center font-bold text-white text-xl">
            A
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-medium tracking-tight text-xl text-[#fafaf7]">ALIGN</span>
              <Badge variant="outline" className="text-[10px] font-mono text-[#f54e00] border-[#f54e00]/40 bg-[#f54e00]/10">
                PUBLIC MONITOR
              </Badge>
            </div>
            <div className="text-xs text-[#a3a199] font-mono flex items-center gap-1.5 mt-0.5">
              <Icon icon="lucide:building-2" className="w-3.5 h-3.5 text-[#f54e00]" />
              <span>{currentOrg.name} &bull; {currentLocation.name} ({currentLocation.subtitle || 'Branch'})</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Fullscreen / Exit toggle */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-[#fafaf7]">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-[#73726c] font-mono hidden sm:block">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="w-10 h-10 border border-[#2e2c26] bg-[#1d1c18] text-[#a3a199] hover:text-[#fafaf7] hover:bg-[#26241e]"
            title="Toggle TV Fullscreen Mode"
          >
            <Icon icon="lucide:maximize-2" className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              queueStore.setRole('CUSTOMER');
              queueStore.setScreen('SCREEN_02_DISCOVERY');
            }}
            className="flex items-center gap-1.5 border border-[#2e2c26] bg-[#1d1c18] text-[#a3a199] hover:text-[#fafaf7] hover:bg-[#26241e] text-xs font-mono"
            title="Exit Public TV Mode"
          >
            <Icon icon="lucide:arrow-left" className="w-3.5 h-3.5 text-[#f54e00]" />
            <span className="hidden sm:inline">Exit Display</span>
          </Button>
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-1 items-stretch">
        {/* Left 7 Cols: NOW SERVING Hero Card & Multi-Counter Grid */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="bg-[#1a1915] rounded-xl p-8 md:p-12 border border-[#2e2c26] flex flex-col items-center justify-center text-center flex-1 relative overflow-hidden">
            {activeCalledToken ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#f54e00] font-medium">
                    NOW SERVING
                  </span>
                </div>

                {/* Huge Token Typography */}
                <div className="text-7xl sm:text-8xl md:text-9xl font-mono font-bold tracking-tight text-[#fafaf7] my-4">
                  {activeCalledToken.tokenNumber}
                </div>

                {/* Target Counter Destination */}
                <div className="w-full max-w-lg bg-[#22201b] p-6 rounded-lg border border-[#333027] mt-3">
                  <div className="text-xs uppercase font-mono tracking-widest text-[#a3a199] font-medium mb-1">
                    PLEASE PROCEED TO
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-[#f54e00] tracking-tight">
                    COUNTER {assignedCounterNumber || activeCalledToken.counterNumber || 1}
                  </div>
                  <div className="text-xs text-[#a3a199] mt-1 font-mono">
                    {appState.services.find(s => s.id === activeCalledToken.serviceId)?.name || 'General Inquiry & Account Services'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#a3a199] font-medium">
                    SERVICE DESKS OPEN
                  </span>
                </div>

                <div className="text-6xl sm:text-7xl md:text-8xl font-mono font-bold tracking-tight text-[#3d3a31] my-4">
                  READY
                </div>

                <div className="w-full max-w-lg bg-[#22201b] p-6 rounded-lg border border-[#333027] mt-3">
                  <div className="text-xs text-[#a3a199] font-mono">
                    Please join the queue to receive your digital token.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Multi-Counter Status Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {appState.counters.map(counter => {
              const servingToken = counter.currentServingTokenId
                ? appState.tokens.find(t => t.id === counter.currentServingTokenId && ['CALLED', 'IN_SERVICE'].includes(t.state))
                : appState.tokens.find(t => t.counterNumber === counter.number && ['CALLED', 'IN_SERVICE'].includes(t.state));

              return (
                <div 
                  key={counter.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between transition-colors ${
                    servingToken
                      ? 'bg-[#22201b] border-[#f54e00]/50'
                      : 'bg-[#181713] border-[#2e2c26]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-medium text-[#a3a199]">
                    <span>COUNTER {counter.number}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      counter.availability === 'ONLINE' ? 'bg-emerald-500' :
                      counter.availability === 'ON_BREAK' ? 'bg-amber-500' :
                      counter.availability === 'AWAY' ? 'bg-amber-500' : 'bg-[#525046]'
                    }`} />
                  </div>
                  <div className="mt-2">
                    {servingToken ? (
                      <div className="text-xl font-mono font-bold text-[#fafaf7]">
                        {servingToken.tokenNumber}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-[#525046] font-medium uppercase">
                        {counter.availability === 'ONLINE' ? 'STANDBY' : counter.availability.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Next in Line Queue Column */}
        <div className="lg:col-span-5 bg-[#1a1915] rounded-xl p-6 md:p-8 border border-[#2e2c26] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#2e2c26] mb-5">
              <h2 className="text-sm font-mono uppercase tracking-wider text-[#fafaf7] flex items-center gap-2">
                <span className="text-[#f54e00] font-bold">|</span>
                <span>NEXT IN LINE</span>
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono text-[#a3a199] border-[#2e2c26] bg-[#22201b]">
                {upcomingTokens.length} WAITING
              </Badge>
            </div>

            {/* Upcoming token cards */}
            <div className="space-y-3">
              {upcomingTokens.length === 0 ? (
                <div className="py-12 text-center text-[#73726c] font-mono text-xs">
                  All waiting tokens have been called.
                </div>
              ) : (
                upcomingTokens.map((tok, idx) => {
                  const srv = appState.services.find(s => s.id === tok.serviceId);
                  return (
                    <div 
                      key={tok.id}
                      className="p-3.5 bg-[#22201b] rounded-lg border border-[#2e2c26] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded bg-[#181713] text-[#fafaf7] flex items-center justify-center font-mono font-bold text-lg border border-[#333027]">
                          {tok.tokenNumber}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#fafaf7]">
                            {srv?.name || 'General Inquiry'}
                          </div>
                          <div className="text-[11px] text-[#a3a199] font-mono mt-0.5">
                            Est. Wait: {tok.estRange}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-[#f54e00]">
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
          <button
            onClick={() => setAudioEnabled(true)}
            className={`mt-6 w-full p-3.5 rounded-lg border flex items-center justify-center gap-3 text-xs font-mono transition-colors cursor-pointer ${
              audioEnabled 
                ? 'bg-[#181713] border-[#2e2c26] text-[#a3a199]' 
                : 'bg-amber-950/20 border-amber-800/40 text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            {audioEnabled ? (
              <>
                <Icon icon="lucide:volume-2" className="w-4 h-4 text-[#f54e00] shrink-0" />
                <span>Audio broadcast active for incoming calls.</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:volume-x" className="w-4 h-4 shrink-0" />
                <span>Click anywhere to enable voice announcements</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="relative z-10 pt-4 border-t border-[#2e2c26] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#73726c] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Please proceed to the counter when your number is called.</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>ALIGN Public Display v2.0</span>
          <span>&bull;</span>
          <span className="text-[#a3a199]">Zero-Latency WebSocket Engine</span>
        </div>
      </div>
    </div>
  );
};
