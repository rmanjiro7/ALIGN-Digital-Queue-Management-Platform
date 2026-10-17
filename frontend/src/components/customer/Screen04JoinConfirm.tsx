import React, { useState } from 'react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { PreparationRequirement } from '../../types';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Screen04JoinConfirmProps {
  appState: AppState;
}

export const Screen04JoinConfirm: React.FC<Screen04JoinConfirmProps> = ({ appState }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<PreparationRequirement[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const selectedService = appState.services.find(s => s.id === appState.selectedServiceId) || appState.services[0] || {
    id: 'default',
    orgId: '',
    locationId: '',
    name: 'General Service',
    description: '',
    icon: 'info',
    enabled: true,
    waitingCount: 0,
    estWaitMins: 10,
    estWaitRange: '10-15 min',
    confidence: 'High' as const,
    associatedQueues: []
  };
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0] || { name: 'Main Organization', id: '' };
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0] || { name: 'Main Location', id: '' };

  React.useEffect(() => {
    if (selectedService) {
      setLoadingReqs(true);
      apiClient.getPreparationRequirements(selectedService.id)
        .then(reqs => setRequirements(reqs.filter((r: PreparationRequirement) => r.isActive).sort((a: PreparationRequirement, b: PreparationRequirement) => a.displayOrder - b.displayOrder)))
        .catch(console.error)
        .finally(() => setLoadingReqs(false));
    }
  }, [selectedService]);

  const handleConfirmJoin = async () => {
    setIsSubmitting(true);
    setJoinError(null);
    try {
      const res = await apiClient.joinQueue(
        currentOrg.id,
        currentLocation.id,
        selectedService.id,
        customerName || undefined,
        customerPhone || undefined,
        smsConsent
      );
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (res && res.id && UUID_REGEX.test(res.id)) {
        const storeToken: any = {
          id: res.id,
          orgId: res.orgId || currentOrg.id,
          locationId: res.locationId || currentLocation.id,
          serviceId: res.serviceId || selectedService.id,
          queueId: res.queueId || 'q-triage',
          tokenNumber: res.tokenNumber,
          state: res.state || res.status || 'WAITING',
          customerName: res.customerName || customerName || 'Walk-in Guest',
          customerPhone: res.customerPhone || customerPhone || '',
          joinedAt: res.joinedAt || new Date().toISOString(),
          peopleAhead: res.position ?? res.peopleAhead ?? 0,
          estWaitMins: res.estimatedWaitTimeMinutes ?? res.estWaitMins ?? 10,
          estRange: res.estRangeText ?? res.estRange ?? '10-15 min',
          confidence: res.confidence || 'High',
          realtimeToken: res.realtimeToken
        };
        queueStore.addJoinedCustomerToken(storeToken);
        queueStore.setScreen('SCREEN_05_ACTIVE_STATUS');
      } else {
        throw new Error('Backend did not return a valid token identifier.');
      }
    } catch (e: any) {
      console.error('[Screen04JoinConfirm] Queue join failed:', e);
      setJoinError(e?.message || 'Failed to join queue. Please check service availability and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Back link */}
      <div className="mb-6 pb-4 border-b border-[#e6e5e0] flex items-center">
        <button
          onClick={() => queueStore.setScreen('SCREEN_03_SERVICES')}
          className="flex items-center gap-2 p-1.5 rounded-md text-[#5a5852] hover:text-[#26251e] hover:bg-white border border-transparent hover:border-[#e6e5e0] transition-colors cursor-pointer"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4" />
          <span className="text-xs font-semibold">Back to Services</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-display-md text-[#26251e]">
          Review &amp; Join
        </h1>
        <p className="text-sm text-[#5a5852] mt-1.5">
          Verify your details and estimated wait before generating your official queue token.
        </p>
      </div>

      {/* Summary Card */}
      <Card className="p-6 md:p-8 space-y-6 mb-6">
        {/* Service Details Matrix */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-[#efeee8]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#807d72]">Organization</span>
            <span className="text-sm font-semibold text-[#26251e]">{currentOrg?.name}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-[#efeee8]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#807d72]">Branch Location</span>
            <span className="text-sm font-semibold text-[#26251e]">{currentLocation?.name}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-[#efeee8]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#807d72]">Selected Service</span>
            <span className="text-sm font-semibold text-[#f54e00]">{selectedService.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#807d72]">Queue Track</span>
            <Badge variant="outline" size="sm">
              General Queue ({selectedService?.associatedQueues?.[0] || 'Walk-in Triage'})
            </Badge>
          </div>
        </div>

        {/* Real-time KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#fafaf7] p-5 rounded-md border border-[#e6e5e0] flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#807d72] mb-1 font-semibold">
              <Icon icon="lucide:users" className="w-3.5 h-3.5 text-[#f54e00]" />
              <span>In Line Ahead</span>
            </div>
            {typeof selectedService.waitingCount !== 'number' || isNaN(selectedService.waitingCount) ? (
              <div className="text-sm font-semibold text-[#807d72] mt-1 font-mono">0 queued</div>
            ) : (
              <>
                <div className="text-3xl font-medium font-mono text-[#26251e]">{selectedService.waitingCount}</div>
                <div className="text-[10px] text-[#807d72] font-mono tracking-widest uppercase mt-0.5">people ahead</div>
              </>
            )}
          </div>

          <div className="bg-[#fafaf7] p-5 rounded-md border border-[#e6e5e0] flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#807d72] mb-1 font-semibold">
              <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-[#f54e00]" />
              <span>Est. Turnaround</span>
            </div>
            {!selectedService.estWaitRange || selectedService.estWaitRange.trim() === '' ? (
              <div className="text-sm font-semibold text-[#807d72] mt-1 font-mono">Available Now</div>
            ) : (
              <>
                <div className="text-3xl font-medium font-mono text-[#f54e00]">{selectedService.estWaitRange}</div>
                <div className="text-[10px] text-[#1f8a65] font-mono font-semibold tracking-wider uppercase mt-0.5">High Confidence</div>
              </>
            )}
          </div>
        </div>

        {/* Preparation Requirements */}
        {requirements.length > 0 && (
          <div className="pt-2">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#807d72] font-semibold mb-3">
              Preparation Requirements
            </div>
            <div className="space-y-2.5">
              {requirements.map(req => (
                <div key={req.id} className="flex gap-3 bg-[#fafaf7] border border-[#e6e5e0] p-4 rounded-md">
                  <Icon icon="lucide:shield-check" className="w-4 h-4 text-[#1f8a65] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#26251e] text-xs flex items-center">
                      {req.title}
                      {req.isRequired && <Badge variant="error" size="sm" className="ml-2">Required</Badge>}
                    </div>
                    {req.description && (
                      <div className="text-xs text-[#5a5852] mt-1 leading-relaxed">
                        {req.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Information Form */}
        <div className="pt-2 space-y-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#807d72] font-semibold">
            Customer Identification (Optional)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] mb-1.5 block font-semibold">Full Name</label>
              <div className="relative">
                <Icon icon="lucide:user" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72]" />
                <Input 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-9"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] mb-1.5 block font-semibold">Mobile Number</label>
              <div className="relative">
                <Icon icon="lucide:phone" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72]" />
                <Input 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pl-9"
                  placeholder="Enter phone number"
                />
              </div>
              {customerPhone && (
                <div className="mt-2.5 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="smsConsent"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="mt-0.5 rounded border-[#cfcdc4] text-[#f54e00] focus:ring-[#f54e00] w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="smsConsent" className="text-xs text-[#5a5852] leading-tight cursor-pointer">
                    I consent to receive SMS notifications about my turn.
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="p-3.5 bg-[#fafaf7] border border-[#e6e5e0] rounded-md flex items-start gap-2.5">
          <Icon icon="lucide:alert-circle" className="w-4 h-4 text-[#f54e00] shrink-0 mt-0.5" />
          <div className="text-xs text-[#5a5852] leading-relaxed">
            <span className="font-semibold text-[#26251e]">Live Sync: </span>
            Keep this window open to receive real-time queue position adjustments and auditory chimes when called.
          </div>
        </div>

        {/* Join Error Banner */}
        {joinError && (
          <div id="join-queue-error-banner" className="p-3.5 bg-[#cf2d56]/10 border border-[#cf2d56]/30 rounded-md flex items-start gap-2.5 text-[#cf2d56]">
            <Icon icon="lucide:alert-circle" className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed">
              <span className="font-semibold">Unable to join queue: </span>
              <span>{joinError}</span>
            </div>
            <button
              type="button"
              onClick={() => setJoinError(null)}
              className="text-xs underline hover:no-underline cursor-pointer ml-2"
            >
              Dismiss
            </button>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => queueStore.setScreen('SCREEN_03_SERVICES')}
          className="flex-1"
        >
          Cancel
        </Button>

        <Button
          id="confirm-join-queue-btn"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          onClick={handleConfirmJoin}
          className="flex-[2] text-xs font-semibold uppercase tracking-wider"
        >
          <Icon icon="lucide:check" className="w-4 h-4 mr-1.5" />
          <span>Confirm &amp; Join Queue</span>
        </Button>
      </div>
    </div>
  );
};
