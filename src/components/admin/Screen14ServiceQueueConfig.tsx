import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Layers, 
  Pause, 
  Play, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';

interface Screen14ServiceQueueConfigProps {
  appState: AppState;
}

export const Screen14ServiceQueueConfig: React.FC<Screen14ServiceQueueConfigProps> = ({ appState }) => {
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  const orgRules = appState.globalRules[currentOrg.id] || {
    autoPauseAtCapacity: true,
    capacityThresholdPercent: 90,
    maxWaitThresholdMins: 45,
  };

  const [autoPause, setAutoPause] = useState(orgRules.autoPauseAtCapacity);
  const [threshold, setThreshold] = useState(orgRules.capacityThresholdPercent);
  const [maxWait, setMaxWait] = useState(orgRules.maxWaitThresholdMins);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const services = appState.services.filter(s => s.orgId === currentOrg.id);

  const handleToggleService = (serviceId: string) => {
    queueStore.toggleServiceStatus(serviceId);
  };

  const handleToggleQueue = (queueId: string) => {
    queueStore.toggleQueueStatus(queueId);
  };

  const handleSaveRules = () => {
    queueStore.updateGlobalRules(currentOrg.id, {
      autoPauseAtCapacity: autoPause,
      capacityThresholdPercent: threshold,
      maxWaitThresholdMins: maxWait,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Create Service Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
            {currentOrg.name} &gt; {currentLocation.name}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Active Services &amp; Queue Mapping
          </h1>
          <p className="text-xs text-slate-500">
            Manage public-facing services, underlying token algorithms, and capacity threshold guardrails.
          </p>
        </div>

        <button
          onClick={() => alert('New Service Creation Wizard initiated.')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00ACC1]/25 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Service</span>
        </button>
      </div>

      {/* Main Layout: Services Cards Left (2 cols), Global Rules Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Services and Associated Queues */}
        <div className="lg:col-span-2 space-y-6">
          {services.map((srv) => {
            const queuesForSrv = appState.queues.filter(q => q.serviceId === srv.id);
            return (
              <div
                key={srv.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
              >
                {/* Service Header with Enabled Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{srv.name}</h2>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        srv.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {srv.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{srv.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleService(srv.id)}
                    className="text-slate-700 hover:text-slate-900 transition-colors p-1 cursor-pointer"
                    title="Toggle Service Enabled State"
                  >
                    {srv.enabled ? (
                      <ToggleRight className="w-8 h-8 text-[#00ACC1]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Associated Operational Queues Table */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                    Associated Operational Queues
                  </div>

                  {queuesForSrv.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {queuesForSrv.map((q) => {
                        const isQActive = q.status === 'Active';
                        return (
                          <div
                            key={q.id}
                            className="p-3.5 flex items-center justify-between gap-3 bg-[#F1F5F9]/50 hover:bg-[#F1F5F9] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#00ACC1] flex items-center justify-center font-mono font-black text-xs shadow-xs">
                                {q.tokenPrefix}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{q.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Range {q.startRange}-{q.endRange} • Avg Wait {q.avgWaitMins}m
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs font-bold font-mono text-slate-800">
                                  {q.currentCount} / {q.maxCapacity} Max
                                </div>
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                                  isQActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {q.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleQueue(q.id)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title={isQActive ? 'Pause Queue' : 'Resume Queue'}
                                >
                                  {isQActive ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                                </button>
                                <button
                                  onClick={() => alert('Editing parameters for queue: ' + q.name)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Edit Queue Parameters"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                      No queues currently configured for this service.
                    </div>
                  )}

                  <button
                    onClick={() => alert('Add queue mapping modal for service: ' + srv.name)}
                    className="mt-2 text-xs font-bold text-[#00ACC1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Map additional queue</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 1 Col: Global Rules & Threshold Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00ACC1]" />
              <span>Global Operational Rules</span>
            </h2>

            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 bg-[#F1F5F9] rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Auto-Pause at Capacity</span>
                  <button
                    onClick={() => setAutoPause(!autoPause)}
                    className="text-[#00ACC1] cursor-pointer"
                  >
                    {autoPause ? <ToggleRight className="w-7 h-7 text-[#00ACC1]" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automatically pause queue token issuance when capacity exceeds safety limit.
                </p>
                {autoPause && (
                  <div className="pt-2">
                    <label className="text-[10px] text-slate-500 font-mono font-bold">Threshold Percentage</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="flex-1 accent-[#00ACC1] cursor-pointer"
                      />
                      <span className="font-mono font-bold text-[#0F172A] text-xs w-8">{threshold}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-[#F1F5F9] rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Max Wait Time Threshold</span>
                <p className="text-[11px] text-slate-500">
                  Flag executive alert when predicted wait time exceeds this threshold.
                </p>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={maxWait}
                    onChange={(e) => setMaxWait(parseInt(e.target.value) || 30)}
                    className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-[#00ACC1]"
                  />
                  <span className="text-slate-500 font-semibold">minutes</span>
                </div>
              </div>

              <button
                id="save-rules-btn"
                onClick={handleSaveRules}
                className="w-full py-3 px-4 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Rules Updated!</span>
                  </>
                ) : (
                  <span>Save Operational Rules</span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              Location Summary
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Services</span>
                <span className="font-bold text-[#0F172A]">{services.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Active Operational Queues</span>
                <span className="font-bold text-[#0F172A]">{appState.queues.length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Active Counters</span>
                <span className="font-bold text-[#0F172A]">{appState.counters.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
