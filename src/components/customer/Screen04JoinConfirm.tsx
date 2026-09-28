import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Clock, 
  Users, 
  ShieldCheck, 
  AlertCircle,
  ArrowLeft,
  Check,
  User,
  Phone
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';

interface Screen04JoinConfirmProps {
  appState: AppState;
}

export const Screen04JoinConfirm: React.FC<Screen04JoinConfirmProps> = ({ appState }) => {
  const [customerName, setCustomerName] = useState('Jane Doe');
  const [customerPhone, setCustomerPhone] = useState('+1 (555) 234-5678');
  const [smsConsent, setSmsConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedService = appState.services.find(s => s.id === appState.selectedServiceId) || appState.services[0];
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  const handleConfirmJoin = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.joinQueue(
        currentOrg.id,
        currentLocation.id,
        selectedService.id,
        customerName || undefined,
        customerPhone || undefined,
        smsConsent
      );
      if (res && res.id) {
        // We add the backend token to the local store so UI can render it
        const storeToken: any = {
          id: res.id,
          orgId: currentOrg.id,
          locationId: currentLocation.id,
          serviceId: selectedService.id,
          queueId: res.queueId || 'q-triage',
          tokenNumber: res.tokenNumber,
          state: res.status || res.state || 'WAITING',
          customerName: customerName || 'Walk-in Guest',
          customerPhone: customerPhone || '',
          joinedAt: res.joinedAt || new Date().toISOString(),
          peopleAhead: res.peopleAhead || 0,
          estWaitMins: res.estWaitMins || 10,
          estRange: res.estRange || '10-15 min',
          confidence: 'High',
          realtimeToken: res.realtimeToken
        };
        queueStore.addJoinedCustomerToken(storeToken);
        queueStore.setScreen('SCREEN_05_ACTIVE_STATUS');
      } else {
        // Fallback
        queueStore.joinQueue(selectedService.id, customerName, customerPhone);
        // Note: queueStore doesn't store consent yet in frontend mockup
        queueStore.setScreen('SCREEN_05_ACTIVE_STATUS');
      }
    } catch (e) {
      console.error(e);
      queueStore.joinQueue(selectedService.id, customerName, customerPhone);
      queueStore.setScreen('SCREEN_05_ACTIVE_STATUS');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 md:py-8">
      {/* Back link */}
      <button
        onClick={() => queueStore.setScreen('SCREEN_03_SERVICES')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Services</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
          Review & Join
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Confirm your service details before generating your live queue token.
        </p>
      </div>

      {/* Bento Summary Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 mb-6">
        {/* Service Details Matrix */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Organization</span>
            <span className="text-xs font-bold text-slate-900">{currentOrg.name}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Location</span>
            <span className="text-xs font-bold text-slate-900">{currentLocation.name}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Service</span>
            <span className="text-xs font-bold text-[#00ACC1]">{selectedService.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Queue Type</span>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#F1F5F9] text-[#0F172A] rounded-lg border border-slate-200">
              General Queue ({selectedService.associatedQueues[0] || 'Walk-in Triage'})
            </span>
          </div>
        </div>

        {/* Real-time KPIs */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#F1F5F9] p-4 rounded-2xl border border-slate-200 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-500 mb-1 font-semibold">
              <Users className="w-3.5 h-3.5 text-[#00ACC1]" />
              <span>Currently Waiting</span>
            </div>
            <div className="text-2xl font-black text-[#0F172A]">{selectedService.waitingCount}</div>
            <div className="text-[10px] text-slate-500 font-mono">people ahead</div>
          </div>

          <div className="bg-[#F1F5F9] p-4 rounded-2xl border border-slate-200 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-500 mb-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#00ACC1]" />
              <span>Estimated Wait</span>
            </div>
            <div className="text-2xl font-black text-[#00ACC1]">{selectedService.estWaitRange}</div>
            <div className="text-[10px] text-emerald-600 font-mono font-semibold">High Confidence</div>
          </div>
        </div>

        {/* Customer Information Form */}
        <div className="pt-2 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
            Customer Details (Optional)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-600 mb-1 block font-semibold">Full Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 mb-1 block font-semibold">Mobile Phone</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1] focus:bg-white"
                />
              </div>
              {customerPhone && (
                <div className="mt-2 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="smsConsent"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="mt-0.5 rounded text-[#00ACC1] focus:ring-[#00ACC1] w-3 h-3"
                  />
                  <label htmlFor="smsConsent" className="text-[10px] text-slate-600 leading-tight">
                    I consent to receive SMS notifications about my queue status.
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Important Instructions Box */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700 shadow-sm">
          <AlertCircle className="w-4 h-4 text-[#00ACC1] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">Important Instructions: </span>
            Keep this page open to track your queue position in real-time. Audio announcements will chime when your token is called.
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => queueStore.setScreen('SCREEN_03_SERVICES')}
          className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          id="confirm-join-queue-btn"
          disabled={isSubmitting || (!!customerPhone && !smsConsent && false)}
          onClick={handleConfirmJoin}
          className="flex-2 py-3.5 px-6 rounded-2xl bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold shadow-lg shadow-[#00ACC1]/25 uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <span>Generating Token...</span>
          ) : (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Confirm & Join Queue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
