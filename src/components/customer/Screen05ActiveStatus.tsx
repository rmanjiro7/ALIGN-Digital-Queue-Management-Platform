import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Clock, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  LogOut, 
  History, 
  Volume2, 
  CheckCircle2, 
  CornerDownRight,
  ArrowRight,
  Coffee,
  HelpCircle,
  BellRing
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { wsClient } from '../../services/websocketClient';
import { apiClient } from '../../services/apiClient';
import { QueueToken } from '../../types';

interface Screen05ActiveStatusProps {
  appState: AppState;
}

export const Screen05ActiveStatus: React.FC<Screen05ActiveStatusProps> = ({ appState }) => {
  const [awaySecondsLeft, setAwaySecondsLeft] = useState<number>(15 * 60);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Safely find active customer token by ID or first truly active token
  const activeTokens = appState.tokens.filter(t => ['WAITING', 'AWAY', 'CALLED', 'IN_SERVICE'].includes(t.state));
  
  const token: QueueToken | null = 
    (appState.activeCustomerTokenId 
      ? (appState.tokens.find(t => t.id === appState.activeCustomerTokenId) || 
         appState.historyTokens.find(t => t.id === appState.activeCustomerTokenId))
      : null) ||
    activeTokens[0] ||
    null;

  const service = token ? (appState.services.find(s => s.id === token.serviceId) || appState.services[0]) : null;
  const location = token ? (appState.locations.find(l => l.id === token.locationId) || appState.locations[0]) : null;

  // Countdown timer for away grace window
  useEffect(() => {
    if (token?.state === 'AWAY') {
      const interval = setInterval(() => {
        setAwaySecondsLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [token?.state]);

  // Handle Token Transfer Recovery
  useEffect(() => {
    if (token?.state === 'TRANSFERRED' && token?.realtimeToken && !isRecovering) {
      setIsRecovering(true);
      setRecoveryError(null);
      apiClient.transferRecovery(token.id, token.realtimeToken)
        .then(newToken => {
          queueStore.addJoinedCustomerToken(newToken);
          queueStore.setActiveCustomerToken(newToken.id);
        })
        .catch(err => {
          console.error('[Screen05] Transfer recovery failed:', err);
          setRecoveryError('Transfer failed. Please see staff for assistance.');
        })
        .finally(() => {
          setIsRecovering(false);
        });
    }
  }, [token?.state, token?.id, token?.realtimeToken, isRecovering]);

  // RT3: Customer Realtime Integration
  useEffect(() => {
    if (!token?.id || !token?.realtimeToken) {
      return;
    }

    wsClient.connect(
      () => {
        wsClient.subscribeToToken(token.id, (msg) => {
          // Pass the event to the queueStore to process it
          // The event payload will contain the token data
          queueStore.handleRealtimeEvent(msg, token.locationId);
        });
      },
      () => {
        console.log('[Screen05] Customer STOMP disconnected');
      },
      (err) => {
        console.error('[Screen05] Customer STOMP error');
      },
      token.realtimeToken
    );

    return () => {
      wsClient.disconnect();
    };
  }, [token?.id, token?.realtimeToken, token?.locationId]);

  // ETA Hardening: Periodically fetch the latest token position/ETA from backend
  useEffect(() => {
    if (!token?.id || token.state !== 'WAITING') return;

    const fetchPosition = async () => {
      try {
        const pos = await apiClient.getTokenPosition(token.id);
        
        // Update the token directly in the store to reflect backend ETA
        const storeToken = appState.tokens.find(t => t.id === token.id);
        if (storeToken) {
          let hasChanges = false;
          if (storeToken.peopleAhead !== pos.position) {
            storeToken.peopleAhead = pos.position;
            hasChanges = true;
          }
          if (storeToken.estWaitMins !== pos.estimatedWaitTimeMinutes) {
            storeToken.estWaitMins = pos.estimatedWaitTimeMinutes;
            hasChanges = true;
          }
          if (pos.estRangeText && storeToken.estRange !== pos.estRangeText) {
            storeToken.estRange = pos.estRangeText;
            hasChanges = true;
          }
          if (storeToken.confidence !== pos.confidence && pos.confidence) {
            storeToken.confidence = pos.confidence;
            hasChanges = true;
          }
          
          if (hasChanges) {
            // Trigger store re-render by calling an existing method that calls saveState()
            queueStore.setActiveCustomerToken(token.id);
          }
        }
      } catch (err) {
        console.error('[Screen05] Failed to fetch token position:', err);
      }
    };

    fetchPosition();
    const interval = setInterval(fetchPosition, 15000); // 15 seconds
    
    return () => clearInterval(interval);
  }, [token?.id, token?.state, appState.tokens]);

  const formatAwayTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleAway = () => {
    if (!token) return;
    if (token.state === 'AWAY') {
      queueStore.leaveAndReturn(token.id, false);
    } else {
      queueStore.leaveAndReturn(token.id, true);
      setAwaySecondsLeft(15 * 60);
    }
  };

  const handleCancelToken = () => {
    if (!token) return;
    queueStore.cancelCustomerToken(token.id);
    queueStore.setScreen('SCREEN_07_HISTORY');
  };

  if (!token) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 md:py-16 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-[#F1F5F9] rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">No Active Queue Token</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You do not currently have a waiting or serving token in the queue.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
              className="px-6 py-3 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
            >
              Join a Queue
            </button>
            <button
              onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
              className="px-6 py-3 bg-[#F1F5F9] hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCalled = token.state === 'CALLED' || token.state === 'IN_SERVICE';
  const isCompleted = token.state === 'COMPLETED';
  const isTransferred = token.state === 'TRANSFERRED';

  return (
    <div className="max-w-xl mx-auto px-4 py-6 md:py-10">
      {/* Live sync header */}
      <div className="flex items-center justify-between mb-6 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-mono font-bold text-slate-800">Live Updates Connected</span>
        </div>

        <div className="flex items-center gap-3">
          {activeTokens.length > 1 && (
            <select
              value={token.id}
              onChange={(e) => queueStore.setActiveCustomerToken(e.target.value)}
              className="text-xs font-mono font-bold bg-[#F1F5F9] border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-[#00ACC1]"
            >
              {activeTokens.map(t => (
                <option key={t.id} value={t.id}>
                  {t.tokenNumber} ({t.state})
                </option>
              ))}
            </select>
          )}

          <button
            id="active-status-history-btn"
            onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#00ACC1] font-bold transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-[#00ACC1]" />
            <span>Queue History</span>
          </button>
        </div>
      </div>

      {/* Main Token Card */}
      <div className={`rounded-3xl p-6 md:p-8 border shadow-sm relative overflow-hidden transition-all ${
        isCalled 
          ? 'bg-[#0F172A] text-white border-[#00ACC1] ring-2 ring-[#00ACC1]/50' 
          : token?.state === 'AWAY'
          ? 'bg-amber-50/90 text-amber-950 border-amber-300'
          : 'bg-white text-slate-900 border-slate-200'
      }`}>
        {/* Glow effect if called */}
        {isCalled && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ACC1]/20 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* State Pill */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
            YOUR TOKEN
          </div>

          <div>
            {isCalled ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#00ACC1] text-white rounded-full text-xs font-mono font-bold animate-pulse">
                <BellRing className="w-3.5 h-3.5" />
                NOW SERVING • COUNTER {token.counterNumber || 3}
              </span>
            ) : token?.state === 'AWAY' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-mono font-bold border border-amber-300">
                <Coffee className="w-3.5 h-3.5" />
                STEPPED AWAY ({formatAwayTime(awaySecondsLeft)})
              </span>
            ) : isCompleted ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-mono font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                COMPLETED
              </span>
            ) : isTransferred ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-mono font-bold">
                <ArrowRight className="w-3.5 h-3.5" />
                TRANSFERRING...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#00ACC1]/10 text-[#00ACC1] rounded-full text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00ACC1] animate-ping"></span>
                WAITING
              </span>
            )}
          </div>
        </div>

        {/* Big Token Number Display */}
        <div className="text-center py-4 my-2">
          <div className={`text-6xl md:text-7xl font-black font-mono tracking-tight ${
            isCalled ? 'text-[#00ACC1]' : token?.state === 'AWAY' ? 'text-amber-800' : 'text-[#0F172A]'
          }`}>
            {token?.tokenNumber || 'A-042'}
          </div>
          <div className={`text-xs mt-2 font-medium ${isCalled ? 'text-slate-300' : 'text-slate-500'}`}>
            {service?.name || 'General Inquiry'} • {location?.name || 'Main Branch'}
          </div>
        </div>

        {/* Status Breakdown or Counter Call Notice */}
        {recoveryError ? (
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-center my-4">
            <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-rose-900 mb-1">Transfer Failed</div>
            <div className="text-xs text-rose-700">{recoveryError}</div>
          </div>
        ) : isTransferred ? (
          <div className="p-8 bg-blue-50/50 rounded-2xl border border-blue-100 text-center my-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-sm font-bold text-blue-900 mb-1">Transferring your token...</div>
            <div className="text-xs text-blue-700">Please wait while we set up your new queue position.</div>
          </div>
        ) : isCalled ? (
          <div className="p-5 bg-white/10 rounded-2xl border border-[#00ACC1]/40 text-center my-4">
            <div className="text-xs uppercase font-mono tracking-wider text-[#00ACC1] font-bold mb-1">
              Please Proceed To
            </div>
            <div className="text-3xl font-black text-white">
              COUNTER {token.counterNumber || 3}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 font-mono">
              Assigned Staff: Alex Mercer • Station 03
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-4 bg-[#F1F5F9] rounded-2xl border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-500 mb-1">
                <Users className="w-3.5 h-3.5 text-[#00ACC1]" />
                <span>People Ahead</span>
              </div>
              <div className="text-3xl font-black text-[#0F172A]">
                {token?.peopleAhead ?? 5}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">in this queue</div>
            </div>

            <div className="p-4 bg-[#F1F5F9] rounded-2xl border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#00ACC1]" />
                <span>Est. Wait</span>
              </div>
              <div className="text-3xl font-black text-[#00ACC1] eta-range">
                {token?.estRange || '15-20 min'}
              </div>
              <div className={`text-[10px] font-mono font-semibold ${
                token?.confidence === 'High' ? 'text-emerald-600' :
                token?.confidence === 'Medium' ? 'text-amber-600' :
                token?.confidence === 'Low' ? 'text-rose-500' : 'text-emerald-600'
              }`}>{token?.confidence || 'High'} Confidence</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5 mt-4">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Progress in Queue</span>
            <span>{isCalled ? '100%' : `${Math.max(15, 100 - (token?.peopleAhead || 5) * 15)}%`}</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00ACC1] rounded-full transition-all duration-500"
              style={{ width: isCalled ? '100%' : `${Math.max(15, 100 - (token?.peopleAhead || 5) * 15)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Leave Waiting Area / Step Away Module */}
      {!isCalled && !isCompleted && !isTransferred && !recoveryError && (
        <div className="mt-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl mt-0.5">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {token?.state === 'AWAY' ? 'Step Away Mode Active' : 'Need to step away?'}
              </div>
              <div className="text-[11px] text-slate-500">
                {token?.state === 'AWAY'
                  ? `Grace window active: ${formatAwayTime(awaySecondsLeft)} remaining before auto-skip.`
                  : 'Hold your spot with a 15-minute grace window.'}
              </div>
            </div>
          </div>

          <button
            id="step-away-toggle-btn"
            onClick={handleToggleAway}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              token?.state === 'AWAY'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-[#F1F5F9] hover:bg-slate-200 text-slate-800'
            }`}
          >
            {token?.state === 'AWAY' ? "I'm Back at Waiting Area" : 'Step Away (15m)'}
          </button>
        </div>
      )}

      {/* Instructions Box */}
      <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700 shadow-sm">
        <ShieldCheck className="w-4 h-4 text-[#00ACC1] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Guidance for this visit: </span>
          You can safely relax in the waiting lounge. When your token is called, your screen will chime and highlight the assigned counter. Please have your photo ID ready.
        </div>
      </div>

      {/* Cancel Action */}
      {!isCompleted && !isTransferred && (
        <div className="mt-6 text-center">
          <button
            id="cancel-token-btn"
            onClick={handleCancelToken}
            className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold cursor-pointer"
          >
            Cancel My Queue Token
          </button>
        </div>
      )}
    </div>
  );
};
