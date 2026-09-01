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
  ArrowRight, 
  Zap, 
  Coffee, 
  Check, 
  UserCheck,
  Power,
  Pause,
  Play,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { CounterAvailability } from '../../types';

interface Screen09OperationsProps {
  appState: AppState;
}

export const Screen09Operations: React.FC<Screen09OperationsProps> = ({ appState }) => {
  const [selectedCounterNumber, setSelectedCounterNumber] = useState<number>(3);
  const [secondsServing, setSecondsServing] = useState(0);
  const [isCallingNext, setIsCallingNext] = useState(false);

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

  const handleCallNext = () => {
    if (!callNextEligibility.allowed || waitingTokens.length === 0) return;
    setIsCallingNext(true);
    queueStore.callNext(selectedCounterNumber, appState.currentStaffUser?.id || 'staff-admin');
    setSecondsServing(0);
    setTimeout(() => {
      setIsCallingNext(false);
    }, 400);
  };

  const handleRecall = () => {
    if (currentToken) {
      queueStore.recallToken(currentToken.id, selectedCounterNumber);
    }
  };

  const handleComplete = () => {
    if (currentToken) {
      queueStore.completeService(currentToken.id);
      setSecondsServing(0);
    }
  };

  const handleSkipOrCancel = () => {
    if (currentToken) {
      queueStore.skipServingToken(currentToken.id);
      setSecondsServing(0);
    }
  };

  const handleAvailabilityChange = (newAvailability: CounterAvailability) => {
    queueStore.setCounterAvailability(selectedCounterNumber, newAvailability);
  };

  const getAvailabilityBadge = (availability: CounterAvailability) => {
    switch (availability) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-mono font-bold">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            ON BREAK
          </span>
        );
      case 'AWAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-xl text-xs font-mono font-bold">
            <Pause className="w-3.5 h-3.5 text-yellow-600" />
            AWAY
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-mono font-bold">
            <Power className="w-3.5 h-3.5 text-slate-500" />
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Station Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3.5 px-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[#00ACC1] uppercase tracking-wider">
            Station Console:
          </span>
          <div className="flex items-center gap-1.5">
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
                      ? 'bg-[#00ACC1] text-slate-950 shadow-md font-black' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>Counter {counter.number}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    counter.availability === 'ONLINE' ? 'bg-emerald-400' :
                    counter.availability === 'ON_BREAK' ? 'bg-amber-400' :
                    counter.availability === 'AWAY' ? 'bg-yellow-400' : 'bg-slate-400'
                  }`} />
                  <span className="text-[10px] opacity-75 font-sans">
                    ({cQueueState})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Operator: <span className="text-white font-bold">{currentCounter.assignedStaffName || 'Alex Mercer'}</span>
        </div>
      </div>

      {/* Top Bar with Counter Status, Availability Selector & Call Next CTA */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
              {currentCounter.name} • Operational Station
            </span>
            <span className="text-slate-300">•</span>
            {getAvailabilityBadge(currentCounter.availability)}
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase ${
              queueState === 'SERVING' 
                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              Queue: {queueState}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Live Queue Operations
          </h1>

          {/* Prominent Operator Availability Switcher */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 mr-1">Set Operator Availability:</span>
            
            <button
              id="set-avail-online-btn"
              onClick={() => handleAvailabilityChange('ONLINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentCounter.availability === 'ONLINE'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE</span>
            </button>

            <button
              id="set-avail-break-btn"
              onClick={() => handleAvailabilityChange('ON_BREAK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentCounter.availability === 'ON_BREAK'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
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
                  ? 'bg-yellow-600 text-white shadow-sm ring-2 ring-yellow-400'
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

        {/* Giant CALL NEXT Button Container */}
        <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
          <button
            id="call-next-main-btn"
            disabled={!callNextEligibility.allowed || waitingTokens.length === 0 || isCallingNext}
            onClick={handleCallNext}
            className="w-full sm:w-auto px-8 py-4 bg-[#00ACC1] hover:bg-[#0097A7] text-white rounded-2xl font-black text-base shadow-xl shadow-[#00ACC1]/25 hover:shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none uppercase tracking-wider"
          >
            <Volume2 className="w-5 h-5 text-white animate-pulse" />
            <span>CALL NEXT</span>
            <span className="text-xs px-2.5 py-0.5 bg-black/20 rounded-full font-mono font-bold text-white">
              {waitingTokens.length} waiting
            </span>
          </button>

          {!callNextEligibility.allowed && (
            <div className="text-[11px] font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5 max-w-sm text-right">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{callNextEligibility.reason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Now Serving Left, Next in Queue Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Now Serving Active Station */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col justify-between">
            {/* Header with Counter badge, Availability badge and Service Timer */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-[#0F172A] text-[#00ACC1] rounded-xl text-xs font-mono font-bold">
                  COUNTER {currentCounter.number}
                </span>
                {getAvailabilityBadge(currentCounter.availability)}
                <span className="text-xs font-bold text-slate-700">{currentCounter.name}</span>
              </div>

              <div className="flex items-center gap-2 bg-[#F1F5F9] px-4 py-2 rounded-xl border border-slate-200">
                <Clock className="w-4 h-4 text-[#00ACC1]" />
                <span className="text-xs font-mono font-bold text-[#0F172A]">
                  Service Duration: {formatServiceTimer(secondsServing)}
                </span>
              </div>
            </div>

            {/* Serving Token Details or Ready/Idle State */}
            {currentToken && (currentToken.state === 'CALLED' || currentToken.state === 'IN_SERVICE') ? (
              <div className="py-8 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                  <div className="inline-block px-3 py-1 bg-[#00ACC1]/10 text-[#00ACC1] rounded-full text-xs font-bold font-mono">
                    NOW SERVING AT COUNTER {currentCounter.number}
                  </div>
                  {currentCounter.availability === 'ON_BREAK' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border bg-amber-50 text-amber-800 border-amber-200">
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      <span>Availability: ON BREAK</span>
                    </div>
                  )}
                  {currentCounter.availability === 'AWAY' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border bg-yellow-50 text-yellow-800 border-yellow-200">
                      <Pause className="w-3.5 h-3.5 text-yellow-600" />
                      <span>Availability: AWAY</span>
                    </div>
                  )}
                  {currentCounter.availability === 'OFFLINE' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border bg-slate-100 text-slate-700 border-slate-300">
                      <Power className="w-3.5 h-3.5 text-slate-500" />
                      <span>Availability: OFFLINE</span>
                    </div>
                  )}
                </div>

                <div className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight mt-1">
                  Now Serving {currentToken.tokenNumber}
                </div>

                <div className="text-7xl md:text-8xl font-black font-mono text-[#0F172A] tracking-tighter my-2 leading-none">
                  {currentToken.tokenNumber}
                </div>
                <div className="text-base font-bold text-slate-800 mt-2">
                  {appState.services.find(s => s.id === currentToken.serviceId)?.name || 'General Inquiry'}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Customer: {currentToken.customerName || 'Walk-in Guest'} • Joined {new Date(currentToken.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* State-specific operational description */}
                <div className="mt-3 max-w-lg mx-auto">
                  {currentCounter.availability === 'ONLINE' && (
                    <p className="text-xs text-slate-500 font-medium">
                      Customer is currently being served at this counter. Complete the current service before calling the next customer.
                    </p>
                  )}
                  {currentCounter.availability === 'ON_BREAK' && (
                    <p className="text-xs text-amber-700 bg-amber-50/80 px-3.5 py-1.5 rounded-xl border border-amber-200 font-medium">
                      Current service can continue, but this counter will not receive new assignments until availability is set to ONLINE.
                    </p>
                  )}
                  {currentCounter.availability === 'AWAY' && (
                    <p className="text-xs text-yellow-800 bg-yellow-50/80 px-3.5 py-1.5 rounded-xl border border-yellow-200 font-medium">
                      Current service remains active. No new customers will be assigned until the counter is ONLINE.
                    </p>
                  )}
                  {currentCounter.availability === 'OFFLINE' && (
                    <p className="text-xs text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-300 font-medium">
                      Current service remains active. No new customers will be assigned until the counter is ONLINE.
                    </p>
                  )}
                </div>

                {/* Desk Actions Toolbar */}
                <div className="grid grid-cols-3 gap-3 mt-8 max-w-md mx-auto">
                  <button
                    id="recall-token-btn"
                    onClick={handleRecall}
                    className="py-3.5 px-3 rounded-2xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <RotateCcw className="w-4 h-4 text-[#00ACC1]" />
                    <span>Recall</span>
                  </button>

                  <button
                    id="complete-service-btn"
                    onClick={handleComplete}
                    className="py-3.5 px-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-slate-900/20 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#00ACC1]" />
                    <span>Complete</span>
                  </button>

                  <button
                    id="skip-token-btn"
                    onClick={handleSkipOrCancel}
                    className="py-3.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>No-Show</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-3">
                {currentCounter.availability === 'ONLINE' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      Counter {currentCounter.number} is Ready
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Station is ONLINE and ready. Click &apos;CALL NEXT&apos; above to summon the next customer.
                    </p>
                  </>
                )}

                {currentCounter.availability === 'ON_BREAK' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                      <Coffee className="w-8 h-8" />
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      Counter {currentCounter.number} is On Break
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Station is currently ON BREAK. Set availability to ONLINE to receive new queue assignments.
                    </p>
                  </>
                )}

                {currentCounter.availability === 'AWAY' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200 flex items-center justify-center mx-auto">
                      <Pause className="w-8 h-8" />
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      Counter {currentCounter.number} is Away
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Station is currently AWAY and unavailable for new queue assignments. Set availability to ONLINE to receive customers.
                    </p>
                  </>
                )}

                {currentCounter.availability === 'OFFLINE' && (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-600 border border-slate-300 flex items-center justify-center mx-auto">
                      <Power className="w-8 h-8" />
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      Counter {currentCounter.number} is Offline
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Station is currently OFFLINE and unavailable for new queue assignments. Set availability to ONLINE to receive customers.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Announcement Link */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#00ACC1]/10 flex items-center justify-center text-[#00ACC1]">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Announcement & PA Control</div>
                <div className="text-[11px] text-slate-500">Broadcast manual messages or trigger text-to-speech chime.</div>
              </div>
            </div>
            <button
              onClick={() => queueStore.setScreen('SCREEN_11_ANNOUNCEMENT_CONTROL')}
              className="text-xs font-bold text-[#00ACC1] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open PA Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Next in Queue List */}
        <div className="space-y-6">
          {/* Next Up Highlight Card */}
          {waitingTokens.length > 0 && (
            <div className="bg-[#00ACC1] p-6 rounded-3xl text-white shadow-xl shadow-[#00ACC1]/30 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full uppercase">
                  Next in Line
                </span>
                <span className="text-xs font-mono font-semibold opacity-90">
                  Est: {waitingTokens[0].estRange}
                </span>
              </div>
              <div>
                <div className="text-4xl font-black font-mono tracking-tight">{waitingTokens[0].tokenNumber}</div>
                <div className="text-sm font-semibold opacity-95 mt-1">
                  {appState.services.find(s => s.id === waitingTokens[0].serviceId)?.name || 'General Inquiry'}
                </div>
              </div>
              <button 
                id="call-to-counter-btn"
                disabled={!callNextEligibility.allowed || isCallingNext}
                onClick={handleCallNext}
                className="w-full bg-white text-[#00ACC1] py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {callNextEligibility.allowed ? `Call to Counter ${currentCounter.number}` : `Counter ${currentCounter.number} Not Online`}
              </button>
            </div>
          )}

          {/* Queue List Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Waiting Queue</h3>
                  <span className="text-[11px] text-slate-500">Live service waitlist</span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#F1F5F9] text-[#0F172A] rounded-lg border border-slate-200">
                  {waitingTokens.length} in queue
                </span>
              </div>

              {/* Token List */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {waitingTokens.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
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
                              Wait: {tok.estRange}
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

            {/* Queue Statistics Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center font-mono text-xs">
              <div className="p-3 bg-[#F1F5F9] rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">AVG WAIT</div>
                <div className="text-lg font-bold text-[#00ACC1] mt-0.5">12 min</div>
              </div>
              <div className="p-3 bg-[#F1F5F9] rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">TODAY SERVED</div>
                <div className="text-lg font-bold text-[#0F172A] mt-0.5">
                  {queueStore.getTodayServedCount(appState.selectedOrgId, appState.selectedLocationId)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
