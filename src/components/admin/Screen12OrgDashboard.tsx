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
import { DateRangeFilter, DateRangePreset } from '../analytics/DateRangeFilter';
import { analyticsApi, AnalyticsOverviewResponse, AnalyticsTrafficResponse, ServiceAnalyticsResponse } from '../../services/analyticsApi';
import { getDateRange, formatDuration } from '../../utils/dateUtils';
import { AnalyticsBarChart } from '../analytics/AnalyticsBarChart';
import { AnalyticsServiceProgress } from '../analytics/AnalyticsServiceProgress';

interface Screen12OrgDashboardProps {
  appState: AppState;
}

export const Screen12OrgDashboard: React.FC<Screen12OrgDashboardProps> = ({ appState }) => {
  const [showAlert, setShowAlert] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(appState.selectedLocationId || 'loc-main');
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];

  const [dateRange, setDateRange] = useState<DateRangePreset>('TODAY');
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [traffic, setTraffic] = useState<AnalyticsTrafficResponse | null>(null);
  const [services, setServices] = useState<ServiceAnalyticsResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { start, end } = getDateRange(dateRange);
        
        const locId = selectedLocationId === 'loc-main' ? undefined : selectedLocationId;

        const [overviewData, trafficData, servicesData] = await Promise.all([
          analyticsApi.getOverview(start, end, appState.selectedOrgId, locId),
          analyticsApi.getTraffic(start, end, appState.selectedOrgId, locId),
          analyticsApi.getServices(start, end, appState.selectedOrgId, locId)
        ]);

        setOverview(overviewData);
        setTraffic(trafficData);
        setServices(servicesData);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange, appState.selectedOrgId, selectedLocationId]);

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
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
        {isLoading && (
           <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
             <RefreshCw className="w-6 h-6 text-[#00ACC1] animate-spin" />
           </div>
        )}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Total Tokens Issued</span>
            <Users className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">
            {overview?.totalTokensIssued || 0}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1 font-mono">
            <span>Served: {overview?.tokensCompleted || 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Avg. Wait Time</span>
            <Clock className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">
            {formatDuration(overview?.avgWaitTimeSeconds || null)}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1 font-mono">
            <span>Avg Svc: {formatDuration(overview?.avgServiceTimeSeconds || null)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Peak Demand Hour</span>
            <Zap className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">
            {overview?.peakHour !== null && overview?.peakHour !== undefined ? `${overview.peakHour}:00` : '--:--'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
            {overview?.peakHourTokenCount || 0} tokens issued/hr
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">
            {overview?.totalTokensIssued 
              ? Math.round((overview.tokensCompleted / overview.totalTokensIssued) * 100) 
              : 0}%
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1 font-mono">
            <span>No-show: {overview?.noShowRate ? Math.round(overview.noShowRate * 100) : 0}%</span>
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
          <div className="h-64 w-full pt-4 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-[#00ACC1] animate-spin" />
              </div>
            )}
            <AnalyticsBarChart data={
              traffic?.hourlyBuckets.map(b => ({
                time: `${b.hour.toString().padStart(2, '0')}:00`,
                issued: b.tokensJoined,
                served: b.tokensCompleted
              })) || []
            } />
          </div>
        </div>

        {/* Right 1 Col: Service Volume Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] mb-1">Service Distribution</h2>
            <p className="text-xs text-slate-500 mb-5">Traffic allocation by service type</p>

          <div className="relative flex-grow">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-[#00ACC1] animate-spin" />
              </div>
            )}
            <AnalyticsServiceProgress data={
              (() => {
                if (!services || services.length === 0) return [];
                const total = services.reduce((sum, s) => sum + s.totalTokens, 0);
                if (total === 0) return [];
                const colors = ['#00ACC1', '#0F172A', '#00ACC170', '#94A3B8', '#38BDF8'];
                return services.slice(0, 5).map((s, i) => ({
                  serviceName: s.serviceName,
                  percentage: (s.totalTokens / total) * 100,
                  color: colors[i % colors.length]
                }));
              })()
            } />
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
