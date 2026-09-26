import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Inbox,
  ServerCrash,
  Activity,
  Layers,
  Filter,
} from 'lucide-react';
import { AppState, queueStore } from '../../services/store';
import { adminApi } from '../../services/adminApi';
import {
  analyticsApi,
  AnalyticsSummaryResponse,
  QueueAnalyticsResponse,
  StaffServiceDurationResponse,
} from '../../services/analyticsApi';
import { KpiCard } from '../analytics/KpiCard';
import { DateRangeFilter, DateRangePreset } from '../analytics/DateRangeFilter';
import { getDateRange, formatDuration } from '../../utils/dateUtils';
import { LocationBranch, Tenant } from '../../types';

interface Screen17AnalyticsProps {
  appState: AppState;
}

type LoadState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

export const Screen17Analytics: React.FC<Screen17AnalyticsProps> = ({ appState }) => {
  const isPlatformAdmin = appState.currentRole === 'PLATFORM_ADMIN';
  const userOrgId = appState.currentUser?.orgId as string | null;

  // ── Organization Selection ────────────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    isPlatformAdmin
      ? appState.tenants[0]?.id ?? ''
      : userOrgId ?? appState.selectedOrgId ?? '',
  );

  // ── Filters ───────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRangePreset>('TODAY');
  const [locations, setLocations] = useState<LocationBranch[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // ── Data ───────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [queueData, setQueueData] = useState<QueueAnalyticsResponse[]>([]);
  const [staffData, setStaffData] = useState<StaffServiceDurationResponse[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Fetch locations when org changes ──────────────────────────────────────
  useEffect(() => {
    if (!selectedOrgId) return;
    let cancelled = false;

    const fetchLocations = async () => {
      try {
        const allLocations = await adminApi.getLocations();
        if (cancelled) return;
        const orgLocations = allLocations.filter(l => l.orgId === selectedOrgId);
        setLocations(orgLocations);
        // Auto-select first location if current selection invalid
        const validIds = orgLocations.map(l => l.id);
        setSelectedLocationId(prev =>
          validIds.includes(prev) ? prev : (orgLocations[0]?.id ?? ''),
        );
      } catch {
        if (!cancelled) setLocations([]);
      }
    };

    fetchLocations();
    return () => { cancelled = true; };
  }, [selectedOrgId]);

  // ── Fetch analytics data ─────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!selectedOrgId || !selectedLocationId) {
      setLoadState('EMPTY');
      return;
    }

    setLoadState('LOADING');
    setErrorMessage('');
    const { start, end } = getDateRange(dateRange);

    try {
      const [summaryRes, queueRes, staffRes] = await Promise.all([
        analyticsApi.getSummary(selectedOrgId, start, end, selectedLocationId),
        analyticsApi.getQueues(selectedOrgId, start, end, selectedLocationId),
        analyticsApi.getStaffServiceDuration(selectedOrgId, start, end, selectedLocationId),
      ]);

      setSummary(summaryRes);
      setQueueData(queueRes);
      setStaffData(staffRes);

      const hasData =
        summaryRes.operationalTokenVolume > 0 ||
        queueRes.length > 0 ||
        staffRes.length > 0;

      setLoadState(hasData ? 'SUCCESS' : 'EMPTY');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load analytics data');
      setLoadState('ERROR');
    }
  }, [selectedOrgId, selectedLocationId, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Handle org change (PLATFORM_ADMIN only) ──────────────────────────────
  const handleOrgChange = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    setSelectedLocationId('');
    setSummary(null);
    setQueueData([]);
    setStaffData([]);
  };

  // ── Format helpers ────────────────────────────────────────────────────────
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const fmtDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const currentOrg = appState.tenants.find(t => t.id === selectedOrgId);
  const currentLocation = locations.find(l => l.id === selectedLocationId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#00ACC1]" />
            Analytics & Reporting
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {currentOrg?.name ?? 'Select Organization'}
            {currentLocation ? ` · ${currentLocation.name}` : ''}
          </p>
        </div>
        <button
          id="analytics-refresh-btn"
          onClick={fetchAnalytics}
          disabled={loadState === 'LOADING'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadState === 'LOADING' ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4" id="analytics-filter-bar">
        {/* Organization Selector (PLATFORM_ADMIN only) */}
        {isPlatformAdmin && (
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-500">Organization:</span>
            <select
              id="analytics-org-selector"
              value={selectedOrgId}
              onChange={e => handleOrgChange(e.target.value)}
              className="bg-[#F1F5F9] border border-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
              aria-label="Select organization"
            >
              {appState.tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range */}
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {/* Location */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-500">Location:</span>
          <select
            id="analytics-location-selector"
            value={selectedLocationId}
            onChange={e => setSelectedLocationId(e.target.value)}
            className="bg-[#F1F5F9] border border-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
            aria-label="Select location"
          >
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content States ────────────────────────────────────────────────── */}
      {loadState === 'LOADING' && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400" id="analytics-loading">
          <Loader2 className="w-10 h-10 animate-spin text-[#00ACC1] mb-4" />
          <span className="text-sm font-mono font-bold">Loading analytics...</span>
        </div>
      )}

      {loadState === 'ERROR' && (
        <div className="flex flex-col items-center justify-center py-20" id="analytics-error">
          <ServerCrash className="w-12 h-12 text-red-400 mb-4" />
          <span className="text-sm font-bold text-slate-700 mb-2">Failed to Load Analytics</span>
          <span className="text-xs text-slate-500 mb-4 max-w-md text-center">{errorMessage}</span>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === 'EMPTY' && (
        <div className="flex flex-col items-center justify-center py-20" id="analytics-empty">
          <Inbox className="w-12 h-12 text-slate-300 mb-4" />
          <span className="text-sm font-bold text-slate-600 mb-1">No Analytics Data</span>
          <span className="text-xs text-slate-400">No token activity found for the selected filters and date range.</span>
        </div>
      )}

      {loadState === 'SUCCESS' && summary && (
        <>
          {/* ── KPI Summary Grid ──────────────────────────────────────────── */}
          <div id="analytics-kpi-grid">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
              Key Performance Indicators
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                title="Operational Token Volume"
                value={summary.operationalTokenVolume}
                icon={Activity}
                iconColor="text-[#00ACC1]"
                borderColor="border-l-[#00ACC1]"
              />
              <KpiCard
                title="Queue Volume"
                value={summary.queueVolume}
                icon={Layers}
                iconColor="text-indigo-500"
                borderColor="border-l-indigo-500"
              />
              <KpiCard
                title="Tokens Completed"
                value={summary.completedTokens}
                icon={CheckCircle2}
                iconColor="text-emerald-500"
                borderColor="border-l-emerald-500"
              />
              <KpiCard
                title="No-Shows"
                value={summary.noShows}
                icon={XCircle}
                iconColor="text-amber-500"
                borderColor="border-l-amber-500"
              />
              <KpiCard
                title="Cancellations"
                value={summary.cancellations}
                icon={XCircle}
                iconColor="text-red-500"
                borderColor="border-l-red-500"
              />
              <KpiCard
                title="Transfers"
                value={summary.transfers}
                icon={ArrowRightLeft}
                iconColor="text-violet-500"
                borderColor="border-l-violet-500"
              />
              <KpiCard
                title="Completion Rate"
                value={fmtPct(summary.completionRate)}
                icon={TrendingUp}
                iconColor="text-emerald-500"
                borderColor="border-l-emerald-500"
                subtitle={<span className="text-[10px] text-slate-400 font-mono">of operational volume</span>}
              />
              <KpiCard
                title="No-Show Rate"
                value={fmtPct(summary.noShowRate)}
                icon={AlertTriangle}
                iconColor="text-amber-500"
                borderColor="border-l-amber-500"
                subtitle={<span className="text-[10px] text-slate-400 font-mono">of operational volume</span>}
              />
              <KpiCard
                title="Cancellation Rate"
                value={fmtPct(summary.cancellationRate)}
                icon={AlertTriangle}
                iconColor="text-red-500"
                borderColor="border-l-red-500"
                subtitle={<span className="text-[10px] text-slate-400 font-mono">of operational volume</span>}
              />
              <KpiCard
                title="Current Queue Load"
                value={summary.currentQueueLoad}
                icon={Users}
                iconColor="text-[#0F172A]"
                borderColor="border-l-[#0F172A]"
                subtitle={<span className="text-[10px] text-amber-600 font-mono font-bold">⚡ Live Snapshot</span>}
              />
            </div>
          </div>

          {/* ── Queue-Level Breakdown ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="analytics-queue-table">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-sm font-black text-[#0F172A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00ACC1]" />
                Queue-Level Operational Breakdown
              </h2>
            </div>
            {queueData.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400 font-mono">
                No queue-level data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-500 font-mono uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3 px-5 font-bold">Queue</th>
                      <th className="text-right py-3 px-4 font-bold">Op. Tokens</th>
                      <th className="text-right py-3 px-4 font-bold">Completed</th>
                      <th className="text-right py-3 px-4 font-bold">No-Shows</th>
                      <th className="text-right py-3 px-4 font-bold">Cancellations</th>
                      <th className="text-right py-3 px-4 font-bold">Transfers</th>
                      <th className="text-right py-3 px-4 font-bold">Completion %</th>
                      <th className="text-right py-3 px-4 font-bold">No-Show %</th>
                      <th className="text-right py-3 px-4 font-bold">Cancel %</th>
                      <th className="text-right py-3 px-4 font-bold">Current Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueData.map((q, idx) => (
                      <tr key={q.queueId} className={`border-t border-slate-100 hover:bg-[#F8FAFC] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFBFD]'}`}>
                        <td className="py-3 px-5 font-bold text-slate-800">{q.queueName}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold text-[#0F172A]">{q.operationalTokenVolume}</td>
                        <td className="text-right py-3 px-4 font-mono text-emerald-600">{q.completedTokens}</td>
                        <td className="text-right py-3 px-4 font-mono text-amber-600">{q.noShows}</td>
                        <td className="text-right py-3 px-4 font-mono text-red-600">{q.cancellations}</td>
                        <td className="text-right py-3 px-4 font-mono text-violet-600">{q.transfers}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold">{fmtPct(q.completionRate)}</td>
                        <td className="text-right py-3 px-4 font-mono">{fmtPct(q.noShowRate)}</td>
                        <td className="text-right py-3 px-4 font-mono">{fmtPct(q.cancellationRate)}</td>
                        <td className="text-right py-3 px-4">
                          <span className="font-mono font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                            {q.currentQueueLoad}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Calling-Staff Average Service Duration ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="analytics-staff-table">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-sm font-black text-[#0F172A] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00ACC1]" />
                Calling-Staff Average Service Duration
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Average time between service start and completion per calling staff member.
              </p>
            </div>
            {staffData.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400 font-mono">
                No staff service duration data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-500 font-mono uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3 px-5 font-bold">Staff</th>
                      <th className="text-right py-3 px-5 font-bold">Completed Segments</th>
                      <th className="text-right py-3 px-5 font-bold">Avg. Service Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffData.map((s, idx) => (
                      <tr key={s.staffId} className={`border-t border-slate-100 hover:bg-[#F8FAFC] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFBFD]'}`}>
                        <td className="py-3 px-5 font-bold text-slate-800">{s.staffName ?? s.staffId}</td>
                        <td className="text-right py-3 px-5 font-mono font-bold text-[#0F172A]">{s.completedSegments}</td>
                        <td className="text-right py-3 px-5">
                          <span className="font-mono font-bold text-[#00ACC1] bg-[#00ACC1]/10 px-3 py-1 rounded-full">
                            {fmtDuration(s.averageServiceDurationSeconds)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
