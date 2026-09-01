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

interface Screen15PlatformDashboardProps {
  appState: AppState;
}

export const Screen15PlatformDashboard: React.FC<Screen15PlatformDashboardProps> = ({ appState }) => {
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
          <button
            onClick={() => queueStore.setScreen('SCREEN_16_TENANT_MANAGEMENT')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md shadow-slate-900/10 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Manage Tenants</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1]" />
          </button>
        </div>
      </div>

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
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">450</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold">Steady throughput</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-mono uppercase text-[10px] font-bold">Active Queues</span>
            <ListOrdered className="w-4 h-4 text-[#00ACC1]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A]">1,200</div>
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
              <p className="text-xs text-slate-500">Total tokens issued globally (Past 7 Days)</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0F172A] bg-[#F1F5F9] px-3 py-1.5 rounded-xl border border-slate-200">
              184,920 Total Tokens
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <div className="h-full w-full flex items-end justify-between gap-3 px-2 pb-6 border-b border-slate-100">
              {[
                { day: 'Mon', count: 24500, height: 70 },
                { day: 'Tue', count: 28900, height: 82 },
                { day: 'Wed', count: 32400, height: 92 },
                { day: 'Thu', count: 31100, height: 88 },
                { day: 'Fri', count: 35200, height: 100 },
                { day: 'Sat', count: 18400, height: 52 },
                { day: 'Sun', count: 14420, height: 41 },
              ].map((bar) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full max-w-[48px] flex items-end justify-center h-44">
                    <div 
                      className="w-full bg-[#0F172A] group-hover:bg-[#00ACC1] rounded-t-xl transition-all duration-300 relative cursor-pointer"
                      style={{ height: `${bar.height}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0F172A] text-[#00ACC1] text-[10px] font-mono font-bold py-0.5 px-2 rounded-lg shadow-md transition-opacity pointer-events-none whitespace-nowrap">
                        {bar.count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-600 mt-1 font-bold">{bar.day}</span>
                </div>
              ))}
            </div>
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
    </div>
  );
};
