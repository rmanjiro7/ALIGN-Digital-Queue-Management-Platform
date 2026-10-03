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
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-3">
            <div className="w-12 h-12 border border-border-strong rounded flex items-center justify-center mx-auto text-content-muted">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold text-content-primary tracking-tight">
              No Active Token
            </h2>
            <p className="text-sm text-content-secondary max-w-xs mx-auto leading-relaxed">
              You do not currently have an active queue token.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
              className="w-full py-4 bg-content-primary text-base font-semibold text-xs uppercase tracking-widest hover:bg-content-secondary transition-colors cursor-pointer"
            >
              Join a Queue
            </button>
            <button
              onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
              className="w-full py-4 bg-surface border border-border-subtle text-content-primary font-semibold text-xs uppercase tracking-widest hover:bg-surface-interactive transition-colors cursor-pointer"
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
    <div className={`min-h-[calc(100vh-4rem)] flex flex-col transition-colors ${
      isCalled ? 'bg-content-primary text-base' : 'bg-base text-content-primary'
    }`}>
      {/* Top Context Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${isCalled ? 'bg-accent animate-pulse' : 'bg-success'} animate-pulse`}></div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-content-secondary">
            Live Updates
          </span>
          {activeTokens.length > 1 && (
            <>
              <span className="text-border-strong">|</span>
              <select
                value={token.id}
                onChange={(e) => queueStore.setActiveCustomerToken(e.target.value)}
                className="text-[10px] font-mono uppercase tracking-widest bg-surface border border-border-subtle px-2 py-1 text-content-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                {activeTokens.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tokenNumber} ({t.state})
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <button
          id="active-status-history-btn"
          onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-content-secondary hover:text-accent transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">History</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-4 md:px-6 py-8 md:py-12 max-w-2xl mx-auto w-full">
        {/* State Badge - Small & Restrained */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-[10px] font-mono uppercase tracking-widest text-content-muted">
            Your Token
          </span>
          <div>
            {isCalled ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-mono font-semibold uppercase tracking-widest ${
                isCalled ? 'bg-accent/10 border-accent text-accent animate-pulse' : 'bg-accent/5 border-border-subtle text-accent'
              }`}>
                <BellRing className="w-3 h-3" />
                Now Serving
              </span>
            ) : token?.state === 'AWAY' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warning/10 border border-warning/30 text-warning text-[10px] font-mono font-semibold uppercase tracking-widest">
                <Coffee className="w-3 h-3" />
                Away ({formatAwayTime(awaySecondsLeft)})
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 border border-success/30 text-success text-[10px] font-mono font-semibold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </span>
            ) : isTransferred ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 text-accent text-[10px] font-mono font-semibold uppercase tracking-widest">
                <ArrowRight className="w-3 h-3" />
                Transferring
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/5 border border-border-subtle text-accent text-[10px] font-mono font-semibold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                Waiting
              </span>
            )}
          </div>
        </div>

        {/* Hero Token Number */}
        <div className="text-center mb-12 md:mb-16">
          <div className={`text-7xl md:text-8xl lg:text-9xl font-bold font-mono tracking-tighter leading-none mb-4 ${
            isCalled ? 'text-accent' : 'text-content-primary'
          }`}>
            {token?.tokenNumber || 'A-042'}
          </div>
          <div className="text-sm text-content-secondary tracking-wide">
            {service?.name || 'General Inquiry'} <span className="text-content-muted mx-2">•</span> {location?.name || 'Main Branch'}
          </div>
        </div>

        {/* Special States: Error, Transfer, Called */}
        {recoveryError ? (
          <div className="mb-8 p-6 border border-error/30 bg-error/5 text-center">
            <AlertTriangle className="w-6 h-6 text-error mx-auto mb-3" />
            <div className="text-sm font-semibold text-content-primary mb-1">Transfer Failed</div>
            <div className="text-xs text-content-secondary">{recoveryError}</div>
          </div>
        ) : isTransferred ? (
          <div className="mb-8 p-8 border border-accent/20 bg-accent/5 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-sm font-semibold text-content-primary mb-1">Transferring your token</div>
            <div className="text-xs text-content-secondary">Please wait while we process your transfer.</div>
          </div>
        ) : isCalled ? (
          <div className={`mb-8 p-8 border text-center ${
            isCalled ? 'bg-accent/10 border-accent/30' : 'bg-surface border-border-strong'
          }`}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-content-muted mb-2">
              Please Proceed To
            </div>
            <div className={`text-5xl md:text-6xl font-bold tracking-tight mb-2 ${isCalled ? 'text-accent' : 'text-content-primary'}`}>
              COUNTER {token.counterNumber || 3}
            </div>
            <div className="text-[10px] font-mono text-content-secondary tracking-wide">
              Assigned Staff: Alex Mercer <span className="text-content-muted mx-2">•</span> Station 03
            </div>
          </div>
        ) : (
          /* Normal Waiting State - Typography-Driven */
          <div className="space-y-10 mb-12">
            {/* People Ahead */}
            <div className="text-center border-b border-border-subtle pb-8">
              <div className="text-[10px] font-mono uppercase tracking-widest text-content-muted mb-3 flex items-center justify-center gap-1.5">
                <Users className="w-3 h-3" />
                <span>People Ahead</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold tracking-tight text-content-primary">
                {token?.peopleAhead ?? 5}
              </div>
            </div>

            {/* Estimated Wait */}
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-content-muted mb-3 flex items-center justify-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Estimated Wait</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold tracking-tight text-accent eta-range mb-2">
                {token?.estRange || '15-20 min'}
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-widest ${
                token?.confidence === 'High' ? 'text-success' :
                token?.confidence === 'Medium' ? 'text-warning' :
                token?.confidence === 'Low' ? 'text-error' : 'text-success'
              }`}>
                {token?.confidence || 'High'} Confidence
              </div>
            </div>
          </div>
        )}

        {/* Step Away Control */}
        {!isCalled && !isCompleted && !isTransferred && !recoveryError && (
          <div className="mb-8 p-6 border border-border-subtle bg-surface">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 border rounded flex-shrink-0 ${
                  token?.state === 'AWAY' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-border-strong bg-surface-elevated text-content-muted'
                }`}>
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-content-primary mb-1">
                    {token?.state === 'AWAY' ? 'Step Away Active' : 'Need to step away?'}
                  </div>
                  <div className="text-xs text-content-secondary leading-relaxed">
                    {token?.state === 'AWAY'
                      ? `Grace window: ${formatAwayTime(awaySecondsLeft)} remaining before skip.`
                      : 'Hold your spot with a 15-minute grace window.'}
                  </div>
                </div>
              </div>

              <button
                id="step-away-toggle-btn"
                onClick={handleToggleAway}
                className={`w-full md:w-auto px-6 py-3 text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer flex-shrink-0 ${
                  token?.state === 'AWAY'
                    ? 'bg-success text-base hover:bg-success/90'
                    : 'bg-surface-interactive border border-border-strong text-content-primary hover:bg-surface-elevated'
                }`}
              >
                {token?.state === 'AWAY' ? "I'm Back" : 'Step Away (15m)'}
              </button>
            </div>
          </div>
        )}

        {/* Guidance Notice */}
        {!isCompleted && !isTransferred && (
          <div className="mb-8 p-4 border border-border-subtle bg-surface flex items-start gap-3 text-xs text-content-secondary">
            <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-content-primary">Guidance: </span>
              You can relax in the waiting area. When called, your screen will highlight the assigned counter. Please have your photo ID ready.
            </p>
          </div>
        )}

        {/* Cancel Action */}
        {!isCompleted && !isTransferred && (
          <div className="text-center pt-4 border-t border-border-subtle">
            <button
              id="cancel-token-btn"
              onClick={handleCancelToken}
              className="text-xs text-error hover:text-error/80 font-semibold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Cancel Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
