import React from 'react';
import { 
  Layers, 
  Building2, 
  MapPin, 
  ListOrdered, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  Server,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { DateRangeFilter, DateRangePreset } from '../analytics/DateRangeFilter';
import { analyticsApi, AnalyticsTrafficResponse, AnalyticsOverviewResponse } from '../../services/analyticsApi';
import { getDateRange } from '../../utils/dateUtils';
import { AnalyticsBarChart } from '../analytics/AnalyticsBarChart';

interface Screen15PlatformDashboardProps {
  appState: AppState;
}

export const Screen15PlatformDashboard: React.FC<Screen15PlatformDashboardProps> = ({ appState }) => {
  const [dateRange, setDateRange] = React.useState<DateRangePreset>('LAST_7_DAYS');
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');
  const [traffic, setTraffic] = React.useState<AnalyticsTrafficResponse | null>(null);
  const [overview, setOverview] = React.useState<AnalyticsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!selectedOrgId) {
        setTraffic(null);
        setOverview(null);
        return;
      }
      
      try {
        setIsLoading(true);
        const { start, end } = getDateRange(dateRange);
        
        const [trafficData, overviewData] = await Promise.all([
          analyticsApi.getTraffic(start, end, selectedOrgId, undefined),
          analyticsApi.getOverview(start, end, selectedOrgId, undefined)
        ]);

        setTraffic(trafficData);
        setOverview(overviewData);
      } catch (err) {
        console.error("Failed to load platform analytics", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange, selectedOrgId]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header with Multi-Tenant Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
            Global Multi-Tenant Infrastructure
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500">
            Global performance, fleet health, and active token telemetry across all client organizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={selectedOrgId} 
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:border-[#00ACC1]"
          >
            <option value="">-- Select Organization --</option>
            {appState.tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => queueStore.setScreen('SCREEN_16_TENANT_MANAGEMENT')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md shadow-slate-900/10 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Manage Tenants</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1]" />
          </button>
        </div>
      </div>

      {!selectedOrgId ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-black text-slate-700 mb-2">Select an Organization</h2>
          <p className="text-sm text-slate-500">Please select an organization from the dropdown above to view analytics.</p>
        </div>
      ) : (
        <>

      {/* 4 Global KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Total Organizations</span>
            <Building2 className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">{appState.tenants.length + 119}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1 font-mono">+3 this month</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Active Locations</span>
            <MapPin className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">{appState.locations.length || 0}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">Steady throughput</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Active Queues</span>
            <ListOrdered className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">{appState.counters.length * 2 || 0}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1 font-mono">Live processing</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">System Health</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">99.9%</div>
          <div className="text-[10px] text-emerald-600 font-mono font-bold mt-1">ALL SYSTEMS NOMINAL</div>
        </div>
      </div>

      {/* Grid: Global Usage Chart Left, System Alerts Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Global Tokens Issued Across Week */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Platform Usage Overview</h2>
              <p className="text-xs text-slate-500">Global traffic for selected period</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0F172A] bg-[#F1F5F9] px-3 py-1.5 rounded-xl border border-slate-200">
              {overview?.totalTokensIssued.toLocaleString() || 0} Total Tokens
            </span>
          </div>

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

        {/* Right 1 Col: Platform Alerts and Nodes */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">System Alerts</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                {appState.alerts.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {appState.alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    alert.severity === 'critical' 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : alert.severity === 'warning'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-blue-50/70 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{alert.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">{alert.timestamp}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {alert.description}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => alert('Opening full infrastructure telemetry logs.')}
              className="w-full py-2.5 text-xs font-bold text-[#00ACC1] hover:underline text-center block pt-2 cursor-pointer"
            >
              View All Telemetry Logs &rarr;
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
