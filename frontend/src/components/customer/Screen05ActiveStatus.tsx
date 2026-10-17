import React, { useState, useEffect } from 'react';
import { queueStore, AppState } from '../../services/store';
import { wsClient } from '../../services/websocketClient';
import { apiClient } from '../../services/apiClient';
import { QueueToken } from '../../types';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { PixelGridLoader } from '../common/PixelGridLoader';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (token?.state === 'TRANSFERRED' && token?.id && UUID_REGEX.test(token.id) && token?.realtimeToken && !isRecovering) {
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
    if (!token?.id || !UUID_REGEX.test(token.id) || !token?.realtimeToken) {
      return;
    }

    wsClient.connect(
      () => {
        wsClient.subscribeToToken(token.id, (msg) => {
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
    if (!token?.id || !UUID_REGEX.test(token.id) || token.state !== 'WAITING') return;

    const fetchPosition = async () => {
      try {
        const pos = await apiClient.getTokenPosition(token.id);
        
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
            queueStore.setActiveCustomerToken(token.id);
          }
        }
      } catch (err) {
        console.error('[Screen05] Failed to fetch token position:', err);
      }
    };

    fetchPosition();
    const interval = setInterval(fetchPosition, 15000);
    
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
        <Card className="max-w-md w-full text-center p-8 space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 border border-[#e6e5e0] bg-[#fafaf7] rounded-md flex items-center justify-center mx-auto text-[#807d72]">
              <Icon icon="lucide:clock" className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-[#26251e] tracking-tight">
              No Active Token
            </h2>
            <p className="text-sm text-[#5a5852] max-w-xs mx-auto leading-relaxed">
              You do not currently have an active line token in the queue system.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
              className="w-full text-xs uppercase tracking-widest font-semibold"
            >
              Browse Queues
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
              className="w-full text-xs uppercase tracking-widest font-semibold"
            >
              View Ticket History
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCalled = token.state === 'CALLED' || token.state === 'IN_SERVICE';
  const isCompleted = token.state === 'COMPLETED';
  const isTransferred = token.state === 'TRANSFERRED';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#f7f7f4] text-[#26251e]">
      {/* Top Context Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e5e0] flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#1f8a65] animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#807d72] font-semibold">
            Live Queue Sync
          </span>
          {activeTokens.length > 1 && (
            <>
              <span className="text-[#cfcdc4]">/</span>
              <select
                value={token.id}
                onChange={(e) => queueStore.setActiveCustomerToken(e.target.value)}
                className="text-[11px] font-mono uppercase tracking-wider bg-[#fafaf7] border border-[#e6e5e0] px-2 py-1 text-[#26251e] rounded-md focus:outline-none focus:border-[#26251e] cursor-pointer"
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
          className="flex items-center gap-1.5 text-xs text-[#5a5852] hover:text-[#26251e] transition-colors cursor-pointer font-medium"
        >
          <Icon icon="lucide:history" className="w-4 h-4" />
          <span>My History</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto w-full">
        {/* Hero Token Card */}
        <Card className="p-8 md:p-10 text-center mb-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#807d72] mb-3 font-semibold">
            Your Active Queue Token
          </div>

          {/* Large Mono Token Number */}
          <div className="text-7xl md:text-8xl font-mono font-medium tracking-tight text-[#26251e] leading-none mb-4 select-all">
            {token?.tokenNumber || '---'}
          </div>

          {/* Timeline Pastel Pill Status */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {isCalled ? (
              <Badge variant="read" size="md" className="px-3 py-1 font-semibold">
                <Icon icon="lucide:bell-ring" className="w-3.5 h-3.5 mr-1" />
                Now Serving at Counter
              </Badge>
            ) : token?.state === 'AWAY' ? (
              <Badge variant="grep" size="md" className="px-3 py-1 font-semibold">
                <Icon icon="lucide:coffee" className="w-3.5 h-3.5 mr-1" />
                Away ({formatAwayTime(awaySecondsLeft)})
              </Badge>
            ) : isCompleted ? (
              <Badge variant="done" size="md" className="px-3 py-1 font-semibold">
                <Icon icon="lucide:check-circle-2" className="w-3.5 h-3.5 mr-1" />
                Service Complete
              </Badge>
            ) : isTransferred ? (
              <Badge variant="thinking" size="md" className="px-3 py-1 font-semibold">
                <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5 mr-1" />
                Transfer In Progress
              </Badge>
            ) : (
              <Badge variant="thinking" size="md" className="px-3 py-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#26251e] animate-pulse mr-1" />
                In Queue (Waiting)
              </Badge>
            )}
          </div>

          <div className="text-xs text-[#5a5852]">
            <span className="font-medium text-[#26251e]">{service?.name || 'General Inquiry'}</span>
            <span className="text-[#cfcdc4] mx-2">/</span>
            <span>{location?.name || 'Main Branch'}</span>
          </div>
        </Card>

        {/* Counter Assignment Callout if Called */}
        {isCalled ? (
          <Card className="p-8 mb-6 border-2 border-[#f54e00] bg-[#fafaf7] text-center animate-in fade-in">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f54e00] font-semibold mb-2">
              Please Proceed Immediately To
            </div>
            <div className="text-5xl md:text-6xl font-mono font-medium tracking-tight text-[#26251e] mb-3">
              COUNTER {token.counterNumber || 1}
            </div>
            <div className="text-xs font-mono text-[#5a5852]">
              {appState.counters.find(c => c.number === token.counterNumber)?.assignedStaffName 
                ? `Assigned Staff: ${appState.counters.find(c => c.number === token.counterNumber)?.assignedStaffName} / Station ${String(token.counterNumber || 1).padStart(2, '0')}`
                : `Station ${String(token.counterNumber || 1).padStart(2, '0')}`}
            </div>
          </Card>
        ) : !isCompleted && !isTransferred && (
          /* Normal Waiting Metrics */
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-6 text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#807d72] mb-1.5 flex items-center justify-center gap-1 font-semibold">
                <Icon icon="lucide:users" className="w-3.5 h-3.5 text-[#807d72]" />
                <span>People Ahead</span>
              </div>
              <div className="text-4xl md:text-5xl font-mono font-medium tracking-tight text-[#26251e]">
                {token?.peopleAhead ?? 5}
              </div>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#807d72] mb-1.5 flex items-center justify-center gap-1 font-semibold">
                <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-[#807d72]" />
                <span>Estimated Wait</span>
              </div>
              <div className="text-4xl md:text-5xl font-mono font-medium tracking-tight text-[#f54e00] mb-1">
                {token?.estRange || '15-20 min'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#1f8a65] font-semibold">
                {token?.confidence || 'High'} Confidence
              </div>
            </Card>
          </div>
        )}

        {/* Step Away Control */}
        {!isCalled && !isCompleted && !isTransferred && !recoveryError && (
          <Card className="p-5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-md bg-[#fafaf7] border border-[#e6e5e0] text-[#5a5852] shrink-0">
                  <Icon icon="lucide:coffee" className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#26251e] mb-0.5">
                    {token?.state === 'AWAY' ? 'Step Away Active' : 'Need to step away?'}
                  </div>
                  <div className="text-xs text-[#5a5852]">
                    {token?.state === 'AWAY'
                      ? `Hold window: ${formatAwayTime(awaySecondsLeft)} remaining before skip.`
                      : 'Hold your spot with a 15-minute grace window.'}
                  </div>
                </div>
              </div>

              <Button
                id="step-away-toggle-btn"
                variant={token?.state === 'AWAY' ? 'primary' : 'outline'}
                size="md"
                onClick={handleToggleAway}
                className="w-full sm:w-auto"
              >
                {token?.state === 'AWAY' ? "I'm Back" : 'Step Away (15m)'}
              </Button>
            </div>
          </Card>
        )}

        {/* Guidance Notice */}
        {!isCompleted && !isTransferred && (
          <div className="mb-6 px-4 py-3 bg-white border border-[#e6e5e0] rounded-md flex items-start gap-2.5 text-xs text-[#5a5852] leading-relaxed">
            <Icon icon="lucide:shield-check" className="w-4 h-4 text-[#1f8a65] shrink-0 mt-0.5" />
            <p>
              Please keep this screen open. When your token is called, your assigned counter will be prominently displayed above with an audible alert.
            </p>
          </div>
        )}

        {/* Cancel Action */}
        {!isCompleted && !isTransferred && (
          <div className="flex justify-end pt-4 border-t border-[#e6e5e0]">
            <button
              id="cancel-token-btn"
              onClick={handleCancelToken}
              className="text-xs text-[#cf2d56] hover:text-[#b02246] font-semibold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Cancel Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
