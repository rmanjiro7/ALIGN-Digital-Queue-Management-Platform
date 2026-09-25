import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  CheckCircle2, 
  RotateCcw, 
  XCircle, 
  Clock, 
  Users, 
  Radio, 
  Sparkles, 
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Zap,
  Coffee,
  Check,
  UserCheck,
  Power,
  Pause,
  Play,
  ShieldAlert,
  ChevronDown,
  ArrowRightLeft
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { wsClient } from '../../services/websocketClient';
import { CounterAvailability } from '../../types';

interface Screen09OperationsProps {
  appState: AppState;
}

export const Screen09Operations: React.FC<Screen09OperationsProps> = ({ appState }) => {
  const [selectedCounterNumber, setSelectedCounterNumber] = useState<number>(1);
  const [secondsServing, setSecondsServing] = useState(0);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const currentCounter = appState.counters.find(c => c.number === selectedCounterNumber) || appState.counters[0];
  const queueState = queueStore.getCounterQueueState(selectedCounterNumber);
  const callNextEligibility = queueStore.canCounterCallNext(selectedCounterNumber);

  const currentToken = currentCounter?.currentServingTokenId
    ? appState.tokens.find(t => t.id === currentCounter.currentServingTokenId && ['CALLED', 'IN_SERVICE'].includes(t.state)) || null
    : appState.tokens.find(t => t.counterNumber === selectedCounterNumber && ['CALLED', 'IN_SERVICE'].includes(t.state)) || null;

  const waitingTokens = appState.tokens.filter(
    t => t.orgId === appState.selectedOrgId && 
         t.locationId === appState.selectedLocationId && 
         (t.state === 'WAITING' || t.state === 'AWAY')
  );

  useEffect(() => {
    const orgId = appState.selectedOrgId;
    const locationId = appState.selectedLocationId;
    
    if (!orgId || !locationId || appState.authStatus !== 'AUTHENTICATED') return;

    wsClient.connect(
      () => {
        // 1. Subscribe to Staff Stream
        wsClient.subscribeToStaffLocation(orgId, locationId, (msg) => {
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
  }, [appState.selectedOrgId, appState.selectedLocationId, appState.authStatus]);

  // Timer for current active customer service duration
  useEffect(() => {
    let interval: any;
    if (currentToken && queueState === 'SERVING') {
      interval = setInterval(() => {
        setSecondsServing(prev => prev + 1);
      }, 1000);
    } else {
      setSecondsServing(0);
    }
    return () => clearInterval(interval);
  }, [currentToken?.id, queueState]);

  const formatServiceTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCallNext = async () => {
    if (!callNextEligibility.allowed || waitingTokens.length === 0) return;
    setIsCallingNext(true);
    
    try {
      const res = await apiClient.authenticatedFetch(`/api/v1/staff/counters/${currentCounter.id}/call-next`, {
        method: 'POST'
      });
      
      if (res.ok) {
        queueStore.speakAnnouncementText('Calling next customer.');
        setSecondsServing(0);
      } else {
        console.error('[Call Next] API failed', await res.text());
      }
    } catch (e) {
      console.error('[Call Next] Network error', e);
    } finally {
      setTimeout(() => setIsCallingNext(false), 400);
    }
  };

  const handleRecall = () => {
    if (currentToken) {
      queueStore.recallToken(currentToken.id, selectedCounterNumber);
    }
  };

  const handleComplete = async () => {
    console.log('[E2E-DEBUG] handleComplete called! currentToken:', currentToken?.id, 'counterId:', currentToken?.counterId);
    if (currentToken && currentToken.counterId) {
      // Optimistic update
      queueStore.completeService(currentToken.id);
      setSecondsServing(0);
      try {
        console.log('[E2E-DEBUG] Calling completeToken API...');
        await apiClient.completeToken(currentToken.id, currentToken.counterId);
        console.log('[E2E-DEBUG] completeToken API success');
      } catch (err) {
        console.error('Failed to complete token', err);
      }
    } else {
      console.log('[E2E-DEBUG] Cannot complete token because currentToken or currentToken.counterId is missing.');
    }
  };

  const handleSkipOrCancel = () => {
    if (currentToken) {
      queueStore.skipServingToken(currentToken.id);
      setSecondsServing(0);
    }
  };

  const handleTransfer = async () => {
    if (!currentToken || !transferTargetId) return;
    setIsTransferring(true);
    setTransferError(null);
    try {
      await apiClient.transferToken(currentToken.id, transferTargetId);
      setIsTransferModalOpen(false);
      setTransferTargetId('');
      setSecondsServing(0);
    } catch (e: any) {
      setTransferError(e.message || 'Transfer failed. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAvailabilityChange = (newAvailability: CounterAvailability) => {
    queueStore.setCounterAvailability(selectedCounterNumber, newAvailability);
  };

  const getAvailabilityStatusDot = (availability: CounterAvailability) => {
    switch (availability) {
      case 'ONLINE':
        return 'bg-emerald-500';
      case 'ON_BREAK':
        return 'bg-amber-500';
      case 'AWAY':
        return 'bg-yellow-500';
      case 'OFFLINE':
        return 'bg-slate-400';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Station Selector Pill Bar */}
      <div className="bg-[#0F172A] text-white p-3 md:p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Active Station:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {appState.counters.map(counter => {
              const isSelected = counter.number === selectedCounterNumber;
              const cQueueState = queueStore.getCounterQueueState(counter.number);
              return (
                <button
                  key={counter.id}
                  id={`select-counter-${counter.number}-btn`}
                  onClick={() => setSelectedCounterNumber(counter.number)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected 
                      ? 'bg-[#00ACC1] text-slate-950 font-black shadow-sm' 
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>Counter {counter.number}</span>
                  <span className={`w-2 h-2 rounded-full ${getAvailabilityStatusDot(counter.availability)}`} />
                  <span className="text-[10px] opacity-75 font-sans">
                    {cQueueState}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <span className="text-slate-500">Operator:</span>
          <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg">
            {currentCounter.assignedStaffName || 'Alex Mercer'}
          </span>
        </div>
      </div>

      {/* Dynamic Queue Warning Banners */}
      {appState.queueWarnings && appState.queueWarnings.filter(w => w.capacityWarningActive || w.waitWarningActive).map(warning => {
        const queueName = appState.queues.find(q => q.id === warning.queueId)?.name || 'Unknown Queue';
        return (
          <div key={`warning-${warning.queueId}`} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">Operational Alert: {queueName} </span>
                <span className="text-amber-800">
                  {warning.capacityWarningActive && warning.waitWarningActive
                    ? 'is currently experiencing both high capacity and excessive wait times.'
                    : warning.capacityWarningActive
                    ? 'has reached its configured capacity threshold limit.'
                    : 'is currently experiencing excessive wait times beyond the configured threshold limit.'}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Primary Operations Hub Banner */}
      <div className="bg-white p-6 md:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
              Counter {currentCounter.number} • {currentCounter.name}
            </span>
            <span className="text-slate-300">•</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold ${
              currentCounter.availability === 'ONLINE'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : currentCounter.availability === 'ON_BREAK'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : currentCounter.availability === 'AWAY'
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${getAvailabilityStatusDot(currentCounter.availability)}`} />
              {currentCounter.availability.replace('_', ' ')}
            </span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase ${
              queueState === 'SERVING' 
                ? 'bg-purple-50 text-purple-800 border border-purple-200' 
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              Queue: {queueState}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Live Queue Console
          </h1>

          {/* Availability Switcher */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1.5">Availability:</span>
            
            <button
              id="set-avail-online-btn"
              onClick={() => handleAvailabilityChange('ONLINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentCounter.availability === 'ONLINE'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>ONLINE</span>
            </button>

            <button
              id="set-avail-break-btn"
              onClick={() => handleAvailabilityChange('ON_BREAK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentCounter.availability === 'ON_BREAK'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>ON BREAK</span>
            </button>

            <button
              id="set-avail-away-btn"
              onClick={() => handleAvailabilityChange('AWAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentCounter.availability === 'AWAY'
                  ? 'bg-yellow-600 text-white shadow-sm ring-2 ring-yellow-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
              <span>AWAY</span>
            </button>

            <button
              id="set-avail-offline-btn"
              onClick={() => handleAvailabilityChange('OFFLINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentCounter.availability === 'OFFLINE'
                  ? 'bg-slate-700 text-white shadow-sm ring-2 ring-slate-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>OFFLINE</span>
            </button>
          </div>
        </div>

        {/* Primary CALL NEXT Action Block */}
        <div className="flex flex-col items-stretch sm:items-end gap-2 w-full lg:w-auto">
          <button
            id="call-next-main-btn"
            disabled={!callNextEligibility.allowed || waitingTokens.length === 0 || isCallingNext}
            onClick={handleCallNext}
            className="w-full sm:w-auto px-8 py-4 bg-[#00ACC1] hover:bg-[#0097A7] text-white rounded-2xl font-black text-sm tracking-wider shadow-lg shadow-[#00ACC1]/25 hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none uppercase"
          >
            <Volume2 className="w-5 h-5 text-white" />
            <span>CALL NEXT</span>
            <span className="text-xs px-2.5 py-0.5 bg-black/20 rounded-full font-mono font-bold text-white">
              {waitingTokens.length} waiting
            </span>
          </button>

          {!callNextEligibility.allowed && (
            <div className="text-[11px] font-medium text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{callNextEligibility.reason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Operational Grid: Now Serving (Left 2 Cols), Queue List (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Customer Station Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col justify-between min-h-[420px]">
            {/* Station Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-[#0F172A] text-[#00ACC1] rounded-xl text-xs font-mono font-bold">
                  COUNTER {currentCounter.number}
                </span>
                <span className="text-xs font-bold text-slate-700">{currentCounter.name}</span>
              </div>

              <div className="flex items-center gap-2 bg-[#F1F5F9] px-3.5 py-1.5 rounded-xl border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-[#00ACC1]" />
                <span className="text-xs font-mono font-bold text-[#0F172A]">
                  Duration: {formatServiceTimer(secondsServing)}
                </span>
              </div>
            </div>

            {/* Serving State vs Idle Ready State */}
            {currentToken && (currentToken.state === 'CALLED' || currentToken.state === 'IN_SERVICE') ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#00ACC1]/10 text-[#00ACC1] rounded-full text-xs font-bold font-mono mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#00ACC1] animate-ping" />
                  CURRENTLY SERVING AT DESK
                </div>

                <div className="text-6xl md:text-8xl font-black font-mono text-[#0F172A] tracking-tighter my-2">
                  {currentToken.tokenNumber}
                </div>

                <div className="text-base font-bold text-slate-800 mt-1">
                  {appState.services.find(s => s.id === currentToken.serviceId)?.name || 'General Inquiry'}
                </div>

                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Customer: {currentToken.customerName || 'Walk-in Guest'} • Joined {new Date(currentToken.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Desk Action Controls */}
                <div className="grid grid-cols-2 gap-3 mt-8 max-w-md mx-auto">
                  <button
                    id="recall-token-btn"
                    onClick={handleRecall}
                    className="py-3 px-3 rounded-2xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <RotateCcw className="w-4 h-4 text-[#00ACC1]" />
                    <span>Recall</span>
                  </button>

                  <button
                    id="complete-service-btn"
                    onClick={handleComplete}
                    className="py-3 px-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#00ACC1]" />
                    <span>Complete</span>
                  </button>

                  <button
                    id="transfer-token-btn"
                    onClick={() => {
                      setTransferTargetId('');
                      setTransferError(null);
                      setIsTransferModalOpen(true);
                    }}
                    className="py-3 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    <span>Transfer</span>
                  </button>

                  <button
                    id="skip-token-btn"
                    onClick={handleSkipOrCancel}
                    className="py-3 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>No-Show</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                  currentCounter.availability === 'ONLINE'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : currentCounter.availability === 'ON_BREAK'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : currentCounter.availability === 'AWAY'
                    ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-300'
                }`}>
                  {currentCounter.availability === 'ONLINE' && <UserCheck className="w-8 h-8" />}
                  {currentCounter.availability === 'ON_BREAK' && <Coffee className="w-8 h-8" />}
                  {currentCounter.availability === 'AWAY' && <Pause className="w-8 h-8" />}
                  {currentCounter.availability === 'OFFLINE' && <Power className="w-8 h-8" />}
                </div>

                <div className="text-base font-bold text-slate-900">
                  Counter {currentCounter.number} is {currentCounter.availability.replace('_', ' ')}
                </div>

                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {currentCounter.availability === 'ONLINE'
                    ? 'Station is ready. Click "CALL NEXT" above to summon the next waiting customer.'
                    : 'Station is currently unavailable for new assignments. Switch to ONLINE to receive queue tokens.'}
                </p>
              </div>
            )}

            {/* Quick PA Audio Trigger Banner */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Radio className="w-4 h-4 text-[#00ACC1]" />
                <span>PA Audio Broadcast System Active</span>
              </div>
              <button
                onClick={() => queueStore.setScreen('SCREEN_11_ANNOUNCEMENT_CONTROL')}
                className="font-bold text-[#00ACC1] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Manual PA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Waiting Queue List */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Waiting Queue</h3>
                  <p className="text-[11px] text-slate-500">Live service waitlist</p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#F1F5F9] text-[#0F172A] rounded-lg border border-slate-200">
                  {waitingTokens.length} waiting
                </span>
              </div>

              {/* Waiting Tokens List */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {waitingTokens.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No customers currently waiting.
                  </div>
                ) : (
                  waitingTokens.map((tok, idx) => {
                    const srv = appState.services.find(s => s.id === tok.serviceId);
                    const isAway = tok.state === 'AWAY';
                    return (
                      <div 
                        key={tok.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          idx === 0 
                            ? 'bg-[#F1F5F9] border-[#00ACC1]/40 shadow-xs' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                            idx === 0 
                              ? 'bg-[#0F172A] text-[#00ACC1]' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tok.tokenNumber}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {srv?.name || 'General Inquiry'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Est. {tok.estRange}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAway ? (
                            <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              <Coffee className="w-2.5 h-2.5" /> Away
                            </span>
                          ) : idx === 0 ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Next
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Daily Operational Stats */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center font-mono text-xs">
              <div className="p-3 bg-[#F1F5F9] rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">AVG WAIT</div>
                <div className="text-lg font-bold text-[#00ACC1] mt-0.5">12 min</div>
              </div>
              <div className="p-3 bg-[#F1F5F9] rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">SERVED TODAY</div>
                <div className="text-lg font-bold text-[#0F172A] mt-0.5">
                  {queueStore.getTodayServedCount(appState.selectedOrgId, appState.selectedLocationId)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && currentToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#00ACC1]" />
              Transfer Token
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Select a target service to transfer token <span className="font-bold text-slate-900">{currentToken.tokenNumber}</span> to.
            </p>

            {transferError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="mb-6 space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Service
              </label>
              <select
                id="transfer-target-select"
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="w-full bg-[#F1F5F9] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00ACC1]/50 focus:border-[#00ACC1] transition-all"
                disabled={isTransferring}
              >
                <option value="">-- Select Target Service --</option>
                {appState.services
                  .filter(s => s.locationId === currentToken.locationId && s.enabled && s.id !== currentToken.serviceId)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTransferTargetId('');
                  setTransferError(null);
                }}
                disabled={isTransferring}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="confirm-transfer-btn"
                onClick={handleTransfer}
                disabled={!transferTargetId || isTransferring}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00ACC1] hover:bg-[#0097A7] shadow-md shadow-[#00ACC1]/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransferring ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
