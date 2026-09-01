import React from 'react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Users, 
  Zap, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Info,
  CheckCircle2
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';

interface Screen03ServicesProps {
  appState: AppState;
}

export const Screen03Services: React.FC<Screen03ServicesProps> = ({ appState }) => {
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  const orgServices = appState.services.filter(
    s => s.orgId === appState.selectedOrgId && s.locationId === appState.selectedLocationId
  );

  // If no services for specific branch, show all active for org or default
  const displayServices = orgServices.length > 0 ? orgServices : appState.services;

  const handleJoinService = (serviceId: string) => {
    queueStore.selectService(serviceId);
    queueStore.setScreen('SCREEN_04_JOIN_CONFIRM');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* Top Location Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Back to Discovery"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
              {currentOrg.name} &gt; {currentLocation.name}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
              Select a Service
            </h1>
          </div>
        </div>

        <button
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
          className="text-xs font-bold text-[#00ACC1] hover:underline bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors cursor-pointer"
        >
          Change Location
        </button>
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 mb-6 shadow-sm">
        <Info className="w-4 h-4 text-[#00ACC1] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700">
          <span className="font-bold text-slate-900">Digital Queue Active: </span>
          Select a service to check current wait times, honest ranges, and join the queue from your device.
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displayServices.map((service) => {
          return (
            <div
              key={service.id}
              id={`service-card-${service.id}`}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-[#00ACC1] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header with Title and Badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {service.name}
                  </h2>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {service.isFastTrack && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00ACC1]/15 text-[#00ACC1] border border-[#00ACC1]/30">
                        <Zap className="w-2.5 h-2.5" />
                        Fast Track
                      </span>
                    )}
                    {service.isHighVolume && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        High Volume
                      </span>
                    )}
                    {!service.isFastTrack && !service.isHighVolume && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                  {service.description}
                </p>

                {/* Wait & People Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-3.5 rounded-2xl border border-slate-200 mb-5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00ACC1]" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono font-semibold">Waiting</div>
                      <div className="text-xs font-bold text-slate-900">{service.waitingCount} people</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00ACC1]" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono font-semibold">Est. Wait</div>
                      <div className="text-xs font-bold text-slate-900">{service.estWaitRange}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                id={`join-service-btn-${service.id}`}
                onClick={() => handleJoinService(service.id)}
                className="w-full py-3 px-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all group shadow-md shadow-slate-900/10 cursor-pointer"
              >
                <span>Join Queue</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
