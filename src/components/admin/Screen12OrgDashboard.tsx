import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Building2,
  Layers,
  ArrowUpRight,
  Monitor,
  Coffee,
  Pause,
  Power,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { CounterAvailability } from '../../types';

interface Screen12OrgDashboardProps {
  appState: AppState;
}

export const Screen12OrgDashboard: React.FC<Screen12OrgDashboardProps> = ({ appState }) => {
  const [showAlert, setShowAlert] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(appState.selectedLocationId || 'loc-main');
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];

  const branchCounters = appState.counters.filter(
    c => c.orgId === appState.selectedOrgId && (c.locationId === selectedLocationId || !c.locationId)
  );

  const getAvailabilityBadge = (availability: CounterAvailability) => {
    switch (availability) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-mono font-bold">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            ON BREAK
          </span>
        );
      case 'AWAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-xs font-mono font-bold">
            <Pause className="w-3.5 h-3.5 text-yellow-600" />
            AWAY
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-mono font-bold">
            <Power className="w-3.5 h-3.5 text-slate-500" />
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Export Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
            {currentOrg.name} • Executive Overview
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Organization Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Administrative oversight, real-time throughput, and branch service metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => alert('Exporting PDF/CSV operations report for ' + currentOrg.name)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Analytics</span>
          </button>

          <button
            onClick={() => queueStore.setScreen('SCREEN_13_LOCATION_MANAGEMENT')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md shadow-slate-900/10 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Manage Locations</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1]" />
          </button>
        </div>
      </div>

      {/* High Wait Alert Banner */}
      {showAlert && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Operational Alert: High Wait Times Detected in Downtown HQ. </span>
              Cashier and Teller service wait time is averaging 45+ minutes. Consider allocating secondary teller desks.
            </div>
          </div>
          <button 
            onClick={() => setShowAlert(false)}
            className="text-amber-700 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Branch-Level Counter Monitoring Table (Requirement 3) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00ACC1]/10 flex items-center justify-center text-[#00ACC1]">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Branch Counter & Operator Monitoring</h2>
              <p className="text-xs text-slate-500">Live operational status, availability state, and active queue assignments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Location:</span>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-[#F1F5F9] border border-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
            >
              {appState.locations.filter(l => l.orgId === appState.selectedOrgId).map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Monitoring Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Counter Number / Name</th>
                <th className="py-3 px-4">Assigned Operator</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4">Queue State</th>
                <th className="py-3 px-4">Current Token</th>
                <th className="py-3 px-4">Supported Service(s)</th>
                <th className="py-3 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {branchCounters.map((counter) => {
                const queueState = queueStore.getCounterQueueState(counter.number);
                const activeToken = counter.currentServingTokenId
                  ? appState.tokens.find(t => t.id === counter.currentServingTokenId && ['CALLED', 'IN_SERVICE'].includes(t.state))
                  : appState.tokens.find(t => t.counterNumber === counter.number && ['CALLED', 'IN_SERVICE'].includes(t.state));
                
                const supportedServices = counter.supportedServiceNames || ['General Inquiry'];

                return (
                  <tr key={counter.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-[#00ACC1] font-mono font-black text-xs flex items-center justify-center">
                          {counter.number}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{counter.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {counter.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{counter.assignedStaffName || 'Unassigned'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getAvailabilityBadge(counter.availability)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase inline-flex items-center gap-1 ${
                        queueState === 'SERVING'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${queueState === 'SERVING' ? 'bg-purple-600' : 'bg-blue-500'}`} />
                        {queueState}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {activeToken ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#00ACC1]/10 text-[#00838F] rounded-lg font-mono font-bold">
                          <span>{activeToken.tokenNumber}</span>
                          <span className="text-[10px] text-slate-500 font-sans">({activeToken.customerName || 'Guest'})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono italic">None (Ready)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {supportedServices.map((srv, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                            {srv}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={counter.availability}
                        onChange={(e) => queueStore.setCounterAvailability(counter.number, e.target.value as CounterAvailability)}
                        className="text-[11px] font-mono font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 hover:border-slate-400 focus:outline-none cursor-pointer"
                      >
                        <option value="ONLINE">Set ONLINE</option>
                        <option value="ON_BREAK">Set ON BREAK</option>
                        <option value="AWAY">Set AWAY</option>
                        <option value="OFFLINE">Set OFFLINE</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Total Served Today</span>
            <Users className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">
            {queueStore.getTodayServedCount(currentOrg.id, selectedLocationId) + 427}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>+12% vs yesterday</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Avg. Wait Time</span>
            <Clock className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">14m</div>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-1 font-mono">
            <span>+2m peak variance</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Peak Demand Hour</span>
            <Zap className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">11:00 AM</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">84 tokens issued/hr</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Staff Efficiency</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">92%</div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1 font-mono">
            <span>+4% target achieved</span>
          </div>
        </div>
      </div>

      {/* Analytics Bento: Throughput Chart Left, Service Breakdown Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hourly Throughput Curve */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Throughput vs. Wait Time</h2>
              <p className="text-xs text-slate-500">Hourly token issuance vs service completion rate</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A]"></span> Tokens Issued
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00ACC1]"></span> Served
              </span>
            </div>
          </div>

          {/* SVG Analytical Area / Bar Graph */}
          <div className="h-64 w-full pt-4">
            <div className="h-full w-full flex items-end justify-between gap-2 px-2 pb-6 border-b border-slate-100">
              {[
                { time: '08:00', issued: 25, served: 20 },
                { time: '09:00', issued: 48, served: 42 },
                { time: '10:00', issued: 75, served: 68 },
                { time: '11:00', issued: 95, served: 80 },
                { time: '12:00', issued: 65, served: 60 },
                { time: '13:00', issued: 52, served: 50 },
                { time: '14:00', issued: 70, served: 64 },
                { time: '15:00', issued: 58, served: 55 },
                { time: '16:00', issued: 35, served: 33 },
              ].map((slot) => (
                <div key={slot.time} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    <div 
                      className="w-3.5 bg-[#0F172A] rounded-t-md transition-all group-hover:bg-slate-700"
                      style={{ height: `${(slot.issued / 100) * 100}%` }}
                      title={`${slot.issued} tokens issued`}
                    />
                    <div 
                      className="w-3.5 bg-[#00ACC1] rounded-t-md transition-all group-hover:bg-[#0097A7]"
                      style={{ height: `${(slot.served / 100) * 100}%` }}
                      title={`${slot.served} tokens served`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">{slot.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Service Volume Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] mb-1">Service Distribution</h2>
            <p className="text-xs text-slate-500 mb-5">Traffic allocation by service type</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">General Inquiry</span>
                  <span className="text-slate-500 font-mono font-bold">45%</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00ACC1] rounded-full" style={{ width: '45%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Account Services</span>
                  <span className="text-slate-500 font-mono font-bold">30%</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0F172A] rounded-full" style={{ width: '30%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Cashier / Tellers</span>
                  <span className="text-slate-500 font-mono font-bold">15%</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00ACC1]/70 rounded-full" style={{ width: '15%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Specialist Consultation</span>
                  <span className="text-slate-500 font-mono font-bold">10%</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100">
            <button
              onClick={() => queueStore.setScreen('SCREEN_14_SERVICE_QUEUE_CONFIG')}
              className="w-full py-3 px-4 bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Configure Services & Queues</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00ACC1]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
