import React, { useState, useEffect } from 'react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { wsClient } from '../../services/websocketClient';
import { CounterAvailability } from '../../types';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

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
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const { error: toastError } = useToast();

  const currentCounter = appState.counters.find(c => c.number === selectedCounterNumber) || (appState.counters.length > 0 ? appState.counters[0] : null);
  const queueState = currentCounter ? queueStore.getCounterQueueState(currentCounter.number) : 'READY';
  const callNextEligibility = currentCounter ? queueStore.canCounterCallNext(currentCounter.number) : { allowed: false, reason: 'No counter station available' };

  const currentToken = currentCounter?.currentServingTokenId
    ? appState.tokens.find(t => t.id === currentCounter.currentServingTokenId && ['CALLED', 'IN_SERVICE'].includes(t.state)) || null
    : currentCounter
    ? appState.tokens.find(t => t.counterNumber === currentCounter.number && ['CALLED', 'IN_SERVICE'].includes(t.state)) || null
    : null;

  const waitingTokens = appState.tokens.filter(
    t => t.orgId === appState.selectedOrgId && 
         t.locationId === appState.selectedLocationId && 
         (t.state === 'WAITING' || t.state === 'AWAY')
  );

  // Synchronize selected counter if previous counter is absent from new snapshot
  useEffect(() => {
    if (appState.counters.length > 0) {
      const exists = appState.counters.some(c => c.number === selectedCounterNumber);
      if (!exists) {
        setSelectedCounterNumber(appState.counters[0].number);
      }
    }
  }, [appState.counters, selectedCounterNumber]);

  useEffect(() => {
    setAvailabilityError(null);
  }, [selectedCounterNumber]);

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
    if (!currentCounter || !callNextEligibility.allowed || waitingTokens.length === 0) return;
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
    if (currentToken && currentCounter) {
      queueStore.recallToken(currentToken.id, currentCounter.number);
    }
  };

  const handleComplete = async () => {
    console.log('[E2E-DEBUG] handleComplete called! currentToken:', currentToken?.id, 'counterId:', currentToken?.counterId);
    if (currentToken && currentToken.counterId) {
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

  const handleAvailabilityChange = async (newAvailability: CounterAvailability) => {
    if (!currentCounter || isUpdatingAvailability) return;
    if (currentCounter.availability === newAvailability) return;

    setIsUpdatingAvailability(true);
    setAvailabilityError(null);

    try {
      const res = await apiClient.authenticatedFetch(`/api/v1/counters/${currentCounter.id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: newAvailability }),
      });

      if (!res.ok) {
        let detail = `Failed to update counter availability (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (body?.message) {
            detail = body.message;
          } else if (body?.code) {
            detail = `${body.code}: Failed to update counter availability`;
          }
        } catch (_) {
          try {
            const text = await res.text();
            if (text) detail = text;
          } catch (__) {}
        }
        throw new Error(detail);
      }

      const data = await res.json();
      const confirmedAvailability = (data?.availability as CounterAvailability) || newAvailability;
      queueStore.setCounterAvailability(currentCounter.number, confirmedAvailability);
    } catch (err: any) {
      const message = err.message || 'Failed to update counter availability';
      console.error('[Availability] Update failed:', err);
      setAvailabilityError(message);
      if (toastError) {
        toastError(message, 'Counter Availability');
      }
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const getAvailabilityStatusDot = (availability: CounterAvailability) => {
    switch (availability) {
      case 'ONLINE':
        return 'bg-[#1f8a65]';
      case 'ON_BREAK':
        return 'bg-[#c08532]';
      case 'AWAY':
        return 'bg-[#dfa88f]';
      case 'OFFLINE':
        return 'bg-[#807d72]';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-[#f7f7f4] min-h-full text-[#26251e]">
      
      {/* Top Station Selector & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e6e5e0]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-mono font-medium text-[#807d72] uppercase tracking-wider">Active Station</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {appState.counters.length === 0 ? (
              <span className="text-xs font-mono text-[#807d72]">No Counters Configured</span>
            ) : (
              appState.counters.map(counter => {
                const isSelected = counter.number === (currentCounter?.number ?? selectedCounterNumber);
                return (
                  <button
                    key={counter.id}
                    id={`select-counter-${counter.number}-btn`}
                    onClick={() => setSelectedCounterNumber(counter.number)}
                    className={`px-3 py-1.5 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer rounded-md border ${
                      isSelected 
                        ? 'bg-white text-[#26251e] border-[#26251e]' 
                        : 'bg-transparent text-[#5a5852] border-transparent hover:text-[#26251e] hover:bg-white'
                    }`}
                  >
                    <span>C{counter.number}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${getAvailabilityStatusDot(counter.availability)}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#807d72]">STAFF OPERATOR:</span>
          <span className="text-[#26251e] font-semibold">
            {currentCounter?.assignedStaffName || appState.currentUser?.name || appState.currentStaffUser?.name || 'Staff Operator'}
          </span>
        </div>
      </div>

      {/* Dynamic Queue Warning Banners */}
      {appState.queueWarnings && appState.queueWarnings.filter(w => w.capacityWarningActive || w.waitWarningActive).map(warning => {
        const queueName = appState.queues.find(q => q.id === warning.queueId)?.name || 'Unknown Queue';
        return (
          <div key={`warning-${warning.queueId}`} className="bg-[#c08532]/10 border border-[#c08532]/30 p-4 rounded-md flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-[#c08532] shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-xs font-semibold text-[#c08532] tracking-wide uppercase">Operational Warning: {queueName} </span>
                <span className="text-xs text-[#26251e] block mt-1">
                  {warning.capacityWarningActive && warning.waitWarningActive
                    ? 'Queue is currently experiencing both high capacity and excessive wait times.'
                    : warning.capacityWarningActive
                    ? 'Queue has reached its configured capacity threshold limit.'
                    : 'Queue is currently experiencing excessive wait times beyond the configured threshold limit.'}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Primary Operations Hub Header */}
      <Card className="p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative">
        <div className="space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm">
              COUNTER {currentCounter ? currentCounter.number : '—'}
            </Badge>
            <span className="text-[#cfcdc4]">/</span>
            <Badge variant={queueState === 'SERVING' ? 'edit' : 'read'} size="sm">
              {queueState}
            </Badge>
          </div>

          <h1 className="text-display-md text-[#26251e]">
            Live Desk Operations
          </h1>

          {/* Availability Controls */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              id="set-avail-online-btn"
              disabled={!currentCounter || isUpdatingAvailability}
              onClick={() => handleAvailabilityChange('ONLINE')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                currentCounter?.availability === 'ONLINE'
                  ? 'bg-[#1f8a65]/10 text-[#1f8a65] border-[#1f8a65]/30'
                  : 'bg-white text-[#5a5852] border-[#e6e5e0] hover:text-[#26251e] hover:border-[#cfcdc4]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentCounter?.availability === 'ONLINE' ? 'bg-[#1f8a65]' : 'bg-current'}`} />
              ONLINE
            </button>

            <button
              id="set-avail-break-btn"
              disabled={!currentCounter || isUpdatingAvailability}
              onClick={() => handleAvailabilityChange('ON_BREAK')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                currentCounter?.availability === 'ON_BREAK'
                  ? 'bg-[#c08532]/10 text-[#c08532] border-[#c08532]/30'
                  : 'bg-white text-[#5a5852] border-[#e6e5e0] hover:text-[#26251e] hover:border-[#cfcdc4]'
              }`}
            >
              <Icon icon="lucide:coffee" className="w-3 h-3" />
              BREAK
            </button>

            <button
              id="set-avail-away-btn"
              disabled={!currentCounter || isUpdatingAvailability}
              onClick={() => handleAvailabilityChange('AWAY')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                currentCounter?.availability === 'AWAY'
                  ? 'bg-[#dfa88f]/20 text-[#26251e] border-[#dfa88f]'
                  : 'bg-white text-[#5a5852] border-[#e6e5e0] hover:text-[#26251e] hover:border-[#cfcdc4]'
              }`}
            >
              <Icon icon="lucide:pause" className="w-3 h-3" />
              AWAY
            </button>

            <button
              id="set-avail-offline-btn"
              disabled={!currentCounter || isUpdatingAvailability}
              onClick={() => handleAvailabilityChange('OFFLINE')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                currentCounter?.availability === 'OFFLINE'
                  ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e]'
                  : 'bg-white text-[#5a5852] border-[#e6e5e0] hover:text-[#26251e] hover:border-[#cfcdc4]'
              }`}
            >
              <Icon icon="lucide:power" className="w-3 h-3" />
              OFFLINE
            </button>
          </div>

          {availabilityError && (
            <div id="availability-error-banner" className="pt-2 flex items-center gap-2 text-xs font-mono text-[#cf2d56]">
              <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5 shrink-0" />
              <span>{availabilityError}</span>
              <button
                type="button"
                onClick={() => setAvailabilityError(null)}
                className="text-[#807d72] hover:text-[#26251e] ml-2 cursor-pointer"
                title="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Primary CALL NEXT Action Block */}
        <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full lg:w-auto relative z-10">
          <Button
            id="call-next-main-btn"
            variant="primary"
            size="lg"
            disabled={!currentCounter || !callNextEligibility.allowed || waitingTokens.length === 0 || isCallingNext}
            onClick={handleCallNext}
            className="w-full sm:w-auto h-12 px-8 text-xs font-semibold uppercase tracking-wider"
          >
            <Icon icon="lucide:volume-2" className="w-5 h-5 mr-1" />
            <span>CALL NEXT</span>
            <span className="text-[10px] px-2 py-0.5 bg-white/20 text-white rounded-full ml-2 font-mono">
              {waitingTokens.length} WAITING
            </span>
          </Button>

          {!callNextEligibility.allowed && (
            <div className="text-[11px] font-mono text-[#c08532] flex items-center gap-1.5">
              <Icon icon="lucide:alert-circle" className="w-3.5 h-3.5" />
              <span>{callNextEligibility.reason}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Main Operational Grid: Now Serving (Left 2 Cols), Queue List (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Customer Station Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 md:p-8 flex flex-col justify-between min-h-[440px]">
            {/* Station Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#efeee8] flex-wrap gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 bg-[#f54e00] rounded-full animate-pulse" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#807d72]">
                  Currently Serving Desk
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fafaf7] border border-[#e6e5e0] rounded-md">
                <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-[#f54e00]" />
                <span className="text-xs font-mono font-semibold text-[#26251e]">
                  {formatServiceTimer(secondsServing)}
                </span>
              </div>
            </div>

            {/* Serving State vs Idle Ready State */}
            {currentToken && (currentToken.state === 'CALLED' || currentToken.state === 'IN_SERVICE') ? (
              <div className="py-8 text-center flex flex-col items-center">
                <div className="text-7xl md:text-8xl font-mono font-medium tracking-tight text-[#26251e] mb-2 select-all">
                  {currentToken.tokenNumber}
                </div>

                <div className="text-base font-semibold text-[#26251e]">
                  {appState.services.find(s => s.id === currentToken.serviceId)?.name || 'General Inquiry'}
                </div>

                <div className="text-xs text-[#5a5852] font-mono tracking-wide mt-1.5">
                  CUSTOMER: {currentToken.customerName || 'WALK-IN'} <span className="text-[#cfcdc4] mx-2">/</span> JOINED {new Date(currentToken.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Desk Action Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 w-full max-w-xl">
                  <Button
                    id="complete-service-btn"
                    variant="primary"
                    onClick={handleComplete}
                    className="h-12 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Icon icon="lucide:check-circle-2" className="w-4 h-4" />
                    <span>Complete</span>
                  </Button>
                  
                  <Button
                    id="recall-token-btn"
                    variant="outline"
                    onClick={handleRecall}
                    className="h-12 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Icon icon="lucide:rotate-ccw" className="w-4 h-4" />
                    <span>Recall</span>
                  </Button>

                  <Button
                    id="transfer-token-btn"
                    variant="outline"
                    onClick={() => {
                      setTransferTargetId('');
                      setTransferError(null);
                      setIsTransferModalOpen(true);
                    }}
                    className="h-12 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 text-[#26251e]"
                  >
                    <Icon icon="lucide:arrow-right-left" className="w-4 h-4 text-[#807d72]" />
                    <span>Transfer</span>
                  </Button>

                  <Button
                    id="skip-token-btn"
                    variant="outline"
                    onClick={handleSkipOrCancel}
                    className="h-12 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 text-[#cf2d56] border-[#cf2d56]/30 hover:bg-[#cf2d56]/5"
                  >
                    <Icon icon="lucide:x-circle" className="w-4 h-4 text-[#cf2d56]" />
                    <span>No Show</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-14 text-center text-[#807d72] flex flex-col items-center justify-center h-full">
                <div className="w-14 h-14 rounded-md border border-[#e6e5e0] flex items-center justify-center mb-4 bg-[#fafaf7]">
                  {currentCounter?.availability === 'ONLINE' && <Icon icon="lucide:user-check" className="w-6 h-6 text-[#1f8a65]" />}
                  {currentCounter?.availability === 'ON_BREAK' && <Icon icon="lucide:coffee" className="w-6 h-6 text-[#c08532]" />}
                  {currentCounter?.availability === 'AWAY' && <Icon icon="lucide:pause" className="w-6 h-6 text-[#dfa88f]" />}
                  {currentCounter?.availability === 'OFFLINE' && <Icon icon="lucide:power" className="w-6 h-6 text-[#807d72]" />}
                  {!currentCounter && <Icon icon="lucide:alert-circle" className="w-6 h-6 text-[#c08532]" />}
                </div>

                <div className="text-xs font-mono font-semibold text-[#26251e] tracking-wider uppercase mb-1.5">
                  {currentCounter ? `STATION ${currentCounter.availability.replace('_', ' ')}` : 'NO COUNTERS AVAILABLE'}
                </div>

                <p className="text-xs text-[#5a5852] max-w-sm leading-relaxed">
                  {currentCounter
                    ? (currentCounter.availability === 'ONLINE'
                      ? 'Desk ready. Click "Call Next" to serve the next customer in line.'
                      : 'Desk is marked unavailable. Switch to Online to receive and serve queue tokens.')
                    : 'No counters are currently configured or active for this location.'}
                </p>
              </div>
            )}

            {/* Quick PA Audio Trigger Banner */}
            <div className="pt-4 border-t border-[#efeee8] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#5a5852]">
                <Icon icon="lucide:radio" className="w-4 h-4 text-[#f54e00]" />
                <span>Auditory Public Announcement System Live</span>
              </div>
              <button
                onClick={() => queueStore.setScreen('SCREEN_11_ANNOUNCEMENT_CONTROL')}
                className="text-xs font-medium text-[#26251e] hover:text-[#f54e00] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Manual Announcements</span>
                <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Waiting Queue List */}
        <div className="space-y-6">
          <Card className="p-6 flex flex-col justify-between min-h-[440px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#efeee8] mb-3">
                <span className="text-[11px] font-mono font-medium text-[#807d72] uppercase tracking-wider">Waiting Queue</span>
                <Badge variant="outline" size="sm">
                  {waitingTokens.length} WAITING
                </Badge>
              </div>

              {/* Waiting Tokens List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {waitingTokens.length === 0 ? (
                  <div className="text-center py-12 text-[#807d72] text-xs font-mono uppercase tracking-wider">
                    Queue is currently empty
                  </div>
                ) : (
                  waitingTokens.map((tok, idx) => {
                    const srv = appState.services.find(s => s.id === tok.serviceId);
                    const isAway = tok.state === 'AWAY';
                    const isNext = idx === 0 && !isAway;
                    
                    return (
                      <div 
                        key={tok.id}
                        className={`p-3 rounded-md border transition-all flex items-center justify-between ${
                          isNext 
                            ? 'bg-[#fafaf7] border-[#26251e]' 
                            : 'bg-white border-[#e6e5e0] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`font-mono font-semibold text-sm ${
                            isNext ? 'text-[#f54e00]' : 'text-[#26251e]'
                          }`}>
                            {tok.tokenNumber}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#26251e]">
                              {srv?.name || 'General Inquiry'}
                            </div>
                            <div className="text-[10px] text-[#807d72] font-mono mt-0.5">
                              EST. {tok.estRange}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAway ? (
                            <Badge variant="grep" size="sm">
                              <Icon icon="lucide:coffee" className="w-3 h-3 mr-0.5" /> AWAY
                            </Badge>
                          ) : isNext ? (
                            <Badge variant="read" size="sm">
                              NEXT
                            </Badge>
                          ) : (
                            <span className="text-xs font-mono text-[#807d72]">
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
            <div className="pt-4 border-t border-[#efeee8] grid grid-cols-2 gap-4 text-center font-mono">
              <div>
                <div className="text-[10px] text-[#807d72] font-semibold tracking-wider uppercase mb-0.5">AVG WAIT</div>
                <div className="text-lg text-[#26251e] font-medium">12<span className="text-xs text-[#807d72] ml-1">min</span></div>
              </div>
              <div>
                <div className="text-[10px] text-[#807d72] font-semibold tracking-wider uppercase mb-0.5">TOTAL SERVED</div>
                <div className="text-lg text-[#26251e] font-medium">
                  {queueStore.getTodayServedCount(appState.selectedOrgId, appState.selectedLocationId)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && currentToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26251e]/30 backdrop-blur-xs p-4">
          <Card className="p-6 md:p-8 w-full max-w-md relative">
            <button 
              className="absolute top-4 right-4 text-[#807d72] hover:text-[#26251e] cursor-pointer"
              onClick={() => {
                setIsTransferModalOpen(false);
                setTransferTargetId('');
                setTransferError(null);
              }}
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>

            <h2 className="text-title-md mb-1.5 flex items-center gap-2">
              <Icon icon="lucide:arrow-right-left" className="w-4 h-4 text-[#f54e00]" />
              Transfer Queue Token
            </h2>
            <p className="text-xs text-[#5a5852] mb-5 font-mono">
              TOKEN: <span className="text-[#26251e] font-bold">{currentToken.tokenNumber}</span>
            </p>

            {transferError && (
              <div className="mb-4 p-3 bg-[#cf2d56]/10 border border-[#cf2d56]/30 text-xs font-mono text-[#cf2d56] flex items-start gap-2.5 rounded-md">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="mb-6 space-y-2">
              <label className="text-[10px] font-mono font-semibold text-[#5a5852] uppercase tracking-wider block">
                Target Service Queue
              </label>
              <select
                id="transfer-target-select"
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="w-full bg-white border border-[#e6e5e0] rounded-md px-3 py-2 text-sm text-[#26251e] focus:outline-none focus:border-[#26251e] transition-colors"
                disabled={isTransferring}
              >
                <option value="">-- Select Destination Service --</option>
                {appState.services
                  .filter(s => s.locationId === currentToken.locationId && s.enabled && s.id !== currentToken.serviceId)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-3 justify-end pt-4 border-t border-[#efeee8]">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTransferTargetId('');
                  setTransferError(null);
                }}
                disabled={isTransferring}
              >
                Cancel
              </Button>
              <Button
                id="confirm-transfer-btn"
                variant="primary"
                size="md"
                onClick={handleTransfer}
                disabled={!transferTargetId || isTransferring}
                isLoading={isTransferring}
              >
                Confirm Transfer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
