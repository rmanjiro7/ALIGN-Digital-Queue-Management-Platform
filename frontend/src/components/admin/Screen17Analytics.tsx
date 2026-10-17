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
  Download,
  Monitor,
} from 'lucide-react';
import { AppState, queueStore } from '../../services/store';
import { adminApi } from '../../services/adminApi';
import {
  analyticsApi,
  AnalyticsSummaryResponse,
  QueueAnalyticsResponse,
  StaffServiceDurationResponse,
} from '../../services/analyticsApi';
import {
  AnalyticsTrafficResponse,
  ServiceAnalyticsResponse,
  CounterAnalyticsResponse
} from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { KpiCard } from '../analytics/KpiCard';
import { DateRangeFilter, DateRangePreset } from '../analytics/DateRangeFilter';
import { getDateRange, formatDuration } from '../../utils/dateUtils';
import { LocationBranch, Tenant } from '../../types';
import { AuthGuard } from '../common/AuthGuard';
import { useToast } from '../common/Toast';
import * as XLSX from 'xlsx';

interface Screen17AnalyticsProps {
  appState: AppState;
}

type LoadState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

export const Screen17Analytics: React.FC<Screen17AnalyticsProps> = ({ appState }) => {
  const { success, error: toastError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
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
  const [trafficData, setTrafficData] = useState<AnalyticsTrafficResponse | null>(null);
  const [serviceData, setServiceData] = useState<ServiceAnalyticsResponse[]>([]);
  const [counterData, setCounterData] = useState<CounterAnalyticsResponse[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Fetch locations when org changes ──────────────────────────────────────
  useEffect(() => {
    if (!selectedOrgId) return;
    // Only fetch if authenticated
    if (appState.authStatus !== 'AUTHENTICATED' && appState.authStatus !== 'AUTH_READY') {
      return;
    }
    let cancelled = false;

    const fetchLocations = async () => {
      try {
        if (!selectedOrgId) return;
        const allLocations = await adminApi.getLocations(selectedOrgId);
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
  }, [selectedOrgId, appState.authStatus]);

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
      const [summaryRes, queueRes, staffRes, trafficRes, serviceRes, counterRes] = await Promise.all([
        analyticsApi.getSummary(selectedOrgId, start, end, selectedLocationId),
        analyticsApi.getQueues(selectedOrgId, start, end, selectedLocationId),
        analyticsApi.getStaffServiceDuration(selectedOrgId, start, end, selectedLocationId),
        analyticsApi.getTrafficPhase685(selectedOrgId, start, end, selectedLocationId, Intl.DateTimeFormat().resolvedOptions().timeZone),
        analyticsApi.getServicesPhase685(selectedOrgId, start, end, selectedLocationId),
        analyticsApi.getCountersPhase685(selectedOrgId, start, end, selectedLocationId),
      ]);

      setSummary(summaryRes);
      setQueueData(queueRes);
      setStaffData(staffRes);
      setTrafficData(trafficRes);
      setServiceData(serviceRes);
      setCounterData(counterRes);

      const hasData =
        summaryRes.operationalTokenVolume > 0 ||
        queueRes.length > 0 ||
        staffRes.length > 0 ||
        trafficRes.hourlyBuckets.length > 0 ||
        trafficRes.dailyBuckets.length > 0 ||
        serviceRes.length > 0 ||
        counterRes.length > 0;

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
    setTrafficData(null);
    setServiceData([]);
    setCounterData([]);
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

  // ── CSV Export Helpers ────────────────────────────────────────────────────
  const generateFilename = (prefix: string) => {
    let dateSuffix = '';
    if (dateRange === 'TODAY') {
      dateSuffix = new Date().toISOString().split('T')[0];
    } else {
      const { start, end } = getDateRange(dateRange);
      const startStr = start.split('T')[0];
      const endStr = end.split('T')[0];
      dateSuffix = `${startStr}-to-${endStr}`;
    }
    return `align-analytics-${prefix}-${dateSuffix}.csv`;
  };

  const downloadCsv = (filename: string, headers: string[], rows: string[][]) => {
    const escapeCell = (cell: any) => {
      if (cell === null || cell === undefined || cell === '') return '';
      const str = String(cell);
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map(row => row.map(escapeCell).join(','))
    ].join('\n');

    // Add BOM for Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSummaryCsv = () => {
    if (!summary) return;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Operational Token Volume', String(summary.operationalTokenVolume)],
      ['Queue Volume', String(summary.queueVolume)],
      ['Tokens Completed', String(summary.completedTokens)],
      ['No-Shows', String(summary.noShows)],
      ['Cancellations', String(summary.cancellations)],
      ['Transfers', String(summary.transfers)],
      ['Completion Rate', fmtPct(summary.completionRate)],
      ['No-Show Rate', fmtPct(summary.noShowRate)],
      ['Cancellation Rate', fmtPct(summary.cancellationRate)],
      ['Current Queue Load', String(summary.currentQueueLoad)]
    ];
    downloadCsv(generateFilename('summary'), headers, rows);
    success('Summary CSV downloaded', 'Export Successful');
  };

  const exportQueuesCsv = () => {
    const headers = [
      'Queue',
      'Operational Tokens',
      'Completed',
      'No-Shows',
      'Cancellations',
      'Transfers',
      'Completion Rate',
      'No-Show Rate',
      'Cancellation Rate',
      'Current Load'
    ];
    const rows = queueData.map(q => [
      q.queueName,
      String(q.operationalTokenVolume),
      String(q.completedTokens),
      String(q.noShows),
      String(q.cancellations),
      String(q.transfers),
      fmtPct(q.completionRate),
      fmtPct(q.noShowRate),
      fmtPct(q.cancellationRate),
      String(q.currentQueueLoad)
    ]);
    downloadCsv(generateFilename('queues'), headers, rows);
    success('Queue CSV downloaded', 'Export Successful');
  };

  const exportStaffCsv = () => {
    const headers = ['Staff', 'Completed Segments', 'Average Service Duration'];
    const rows = staffData.map(s => [
      s.staffName || 'Unknown Staff',
      String(s.completedSegments),
      s.averageServiceDurationSeconds !== null && s.averageServiceDurationSeconds !== undefined
        ? String(s.averageServiceDurationSeconds)
        : 'N/A'
    ]);
    downloadCsv(generateFilename('staff'), headers, rows);
    success('Staff CSV downloaded', 'Export Successful');
  };

  const exportAnalyticsXlsx = () => {
    if (!summary || isExporting) return;
    setIsExporting(true);

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ['Metric', 'Value'],
        ['Operational Token Volume', summary.operationalTokenVolume],
        ['Queue Volume', summary.queueVolume],
        ['Tokens Completed', summary.completedTokens],
        ['No-Shows', summary.noShows],
        ['Cancellations', summary.cancellations],
        ['Transfers', summary.transfers],
        ['Completion Rate', fmtPct(summary.completionRate)],
        ['No-Show Rate', fmtPct(summary.noShowRate)],
        ['Cancellation Rate', fmtPct(summary.cancellationRate)],
        ['Current Queue Load', summary.currentQueueLoad]
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Sheet 2: Queues
      const queueRows = [
        ['Queue', 'Operational Tokens', 'Completed', 'No-Shows', 'Cancellations', 'Transfers', 'Completion Rate', 'No-Show Rate', 'Cancellation Rate', 'Current Load'],
        ...queueData.map(q => [
          q.queueName,
          q.operationalTokenVolume,
          q.completedTokens,
          q.noShows,
          q.cancellations,
          q.transfers,
          fmtPct(q.completionRate),
          fmtPct(q.noShowRate),
          fmtPct(q.cancellationRate),
          q.currentQueueLoad
        ])
      ];
      const queueWs = XLSX.utils.aoa_to_sheet(queueRows);
      XLSX.utils.book_append_sheet(wb, queueWs, 'Queues');

      // Sheet 3: Staff
      const staffRows = [
        ['Staff', 'Completed Segments', 'Average Service Duration (s)'],
        ...staffData.map(s => [
          s.staffName || 'Unknown Staff',
          s.completedSegments,
          s.averageServiceDurationSeconds !== null && s.averageServiceDurationSeconds !== undefined
            ? s.averageServiceDurationSeconds
            : 'N/A'
        ])
      ];
      const staffWs = XLSX.utils.aoa_to_sheet(staffRows);
      XLSX.utils.book_append_sheet(wb, staffWs, 'Staff');

      // ── Filename ───────────────────────────────────────────────────────────
      let dateSuffix = '';
      if (dateRange === 'TODAY') {
        dateSuffix = new Date().toISOString().split('T')[0];
      } else {
        const { start, end } = getDateRange(dateRange);
        dateSuffix = `${start.split('T')[0]}-to-${end.split('T')[0]}`;
      }
      const filename = `ALIGN_Analytics_${dateSuffix}.xlsx`;

      // ── Write as raw bytes then Blob-download ─────────────────────────────
      // NOTE: XLSX.writeFile is intentionally NOT used here.
      // In Vite browser bundles, xlsx's require('fs') is stubbed by Vite,
      // so _fs.writeFileSync gets called instead of the Blob download path,
      // producing a ~200-byte stub file. We generate the bytes ourselves
      // via XLSX.write({type:'array'}) and trigger a proper Blob download.
      // In the browser this returns Uint8Array; in Node it returns ArrayBuffer.
      // Both are accepted by the Blob constructor.
      const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const byteLen: number =
        (xlsxData as ArrayBuffer).byteLength ??
        (xlsxData as Uint8Array).length ??
        0;

      // ── Diagnostic logging (safe to keep; reveals issues in DevTools) ──────
      console.log('[XLSX Export] xlsxData type:', xlsxData?.constructor?.name);
      console.log('[XLSX Export] byte length:', byteLen);
      console.log('[XLSX Export] filename:', filename);

      if (!xlsxData || byteLen < 1000) {
        throw new Error(
          `Workbook generation produced unexpectedly small output (${byteLen} bytes).`
        );
      }

      const blob = new Blob([xlsxData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      console.log('[XLSX Export] Blob size:', blob.size, 'bytes');

      const url = URL.createObjectURL(blob);
      console.log('[XLSX Export] Object URL created:', url.substring(0, 60));

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // ── CRITICAL FIX ───────────────────────────────────────────────────────
      // URL.revokeObjectURL must NOT be called synchronously after a.click().
      // The browser fetches the blob URL asynchronously on the next tick.
      // Revoking immediately (same call stack) invalidates the resource before
      // the browser can read it, silently producing a broken/empty download.
      // A 100 ms delay is sufficient for Chrome/Firefox/Edge to initiate the
      // download before the URL is revoked.
      setTimeout(() => URL.revokeObjectURL(url), 100);

      success(
        `Analytics workbook downloaded (${Math.round(blob.size / 1024)} KB)`,
        'Export Successful'
      );
    } catch (err: any) {
      console.error('[XLSX Export] Error:', err);
      toastError(
        err?.message?.includes('bytes')
          ? err.message
          : 'Failed to generate Excel analytics report.',
        'Export Error'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AuthGuard appState={appState}>
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-content-primary tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-accent" />
              Analytics & Reporting
          </h1>
          <p className="text-[11px] text-content-muted font-mono mt-1 uppercase tracking-wide font-semibold">
            {currentOrg?.name ?? 'Select Organization'}
            {currentLocation ? ` · ${currentLocation.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="analytics-export-all-btn"
            onClick={exportAnalyticsXlsx}
            disabled={loadState !== 'SUCCESS' || !summary || isExporting}
            className="flex items-center gap-2 px-3 py-2 rounded bg-accent border border-transparent text-white text-xs font-bold hover:bg-accent-hover transition-all disabled:opacity-50 cursor-pointer"
            title="Export Analytics (Excel)"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export Analytics
          </button>
          <button
            id="analytics-export-summary-btn"
            onClick={exportSummaryCsv}
            disabled={loadState !== 'SUCCESS' || !summary}
            className="flex items-center gap-2 px-3 py-2 rounded bg-surface-interactive border border-border-strong text-content-primary text-xs font-bold hover:bg-border-subtle transition-all disabled:opacity-50 cursor-pointer"
            title="Export Summary CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Summary CSV
          </button>
          <button
            id="analytics-export-queues-btn"
            onClick={exportQueuesCsv}
            disabled={loadState !== 'SUCCESS'}
            className="flex items-center gap-2 px-3 py-2 rounded bg-surface-interactive border border-border-strong text-content-primary text-xs font-bold hover:bg-border-subtle transition-all disabled:opacity-50 cursor-pointer"
            title="Export Queue CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Queue CSV
          </button>
          <button
            id="analytics-export-staff-btn"
            onClick={exportStaffCsv}
            disabled={loadState !== 'SUCCESS'}
            className="flex items-center gap-2 px-3 py-2 rounded bg-surface-interactive border border-border-strong text-content-primary text-xs font-bold hover:bg-border-subtle transition-all disabled:opacity-50 cursor-pointer"
            title="Export Staff CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Staff CSV
          </button>
          <button
            id="analytics-refresh-btn"
            onClick={fetchAnalytics}
            disabled={loadState === 'LOADING'}
            className="flex items-center gap-2 px-4 py-2 rounded bg-surface-elevated border border-border-strong text-content-primary text-xs font-bold hover:bg-surface-interactive transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadState === 'LOADING' ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="bg-surface-elevated p-4 rounded-lg border border-border-subtle flex flex-wrap items-center gap-4" id="analytics-filter-bar">
        {/* Organization Selector (PLATFORM_ADMIN only) */}
        {isPlatformAdmin && (
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-content-secondary" />
            <span className="text-[11px] uppercase tracking-wide font-semibold text-content-secondary">Organization:</span>
            <select
              id="analytics-org-selector"
              value={selectedOrgId}
              onChange={e => handleOrgChange(e.target.value)}
              className="bg-surface-interactive border border-border-strong text-xs font-mono rounded px-2.5 py-1 text-content-primary focus:outline-none focus:border-accent"
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
          <Filter className="w-3.5 h-3.5 text-content-secondary" />
          <span className="text-[11px] uppercase tracking-wide font-semibold text-content-secondary">Location:</span>
          <select
            id="analytics-location-selector"
            value={selectedLocationId}
            onChange={e => setSelectedLocationId(e.target.value)}
            className="bg-surface-interactive border border-border-strong text-xs font-mono rounded px-2.5 py-1 text-content-primary focus:outline-none focus:border-accent"
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
        <div className="flex flex-col items-center justify-center py-20 text-content-muted" id="analytics-loading">
          <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
          <span className="text-sm font-mono font-bold">Loading analytics...</span>
        </div>
      )}

      {loadState === 'ERROR' && (
        <div className="flex flex-col items-center justify-center py-20" id="analytics-error">
          <ServerCrash className="w-12 h-12 text-red-500 mb-4" />
          <span className="text-sm font-bold text-content-primary mb-2">Failed to Load Analytics</span>
          <span className="text-xs text-content-secondary mb-4 max-w-md text-center">{errorMessage}</span>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded bg-surface-interactive border border-border-strong text-content-primary text-xs font-bold hover:bg-border-subtle transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === 'EMPTY' && (
        <div className="flex flex-col items-center justify-center py-20" id="analytics-empty">
          <Inbox className="w-12 h-12 text-content-muted mb-4" />
          <span className="text-sm font-bold text-content-secondary mb-1">No Analytics Data</span>
          <span className="text-xs text-content-muted">No token activity found for the selected filters and date range.</span>
        </div>
      )}

      {loadState === 'SUCCESS' && summary && (
        <>
          {/* ── KPI Summary Grid ──────────────────────────────────────────── */}
          <div id="analytics-kpi-grid">
            <div className="text-[10px] font-mono font-bold text-content-muted uppercase tracking-wider mb-3">
              Key Performance Indicators
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                title="Operational Token Volume"
                value={summary.operationalTokenVolume}
                icon={Activity}
                iconColor="text-accent"
                borderColor="border-l-accent"
              />
              <KpiCard
                title="Queue Volume"
                value={summary.queueVolume}
                icon={Layers}
                iconColor="text-indigo-400"
                borderColor="border-l-indigo-400"
              />
              <KpiCard
                title="Tokens Completed"
                value={summary.completedTokens}
                icon={CheckCircle2}
                iconColor="text-emerald-400"
                borderColor="border-l-emerald-400"
              />
              <KpiCard
                title="No-Shows"
                value={summary.noShows}
                icon={XCircle}
                iconColor="text-amber-400"
                borderColor="border-l-amber-400"
              />
              <KpiCard
                title="Cancellations"
                value={summary.cancellations}
                icon={XCircle}
                iconColor="text-red-400"
                borderColor="border-l-red-400"
              />
              <KpiCard
                title="Transfers"
                value={summary.transfers}
                icon={ArrowRightLeft}
                iconColor="text-violet-400"
                borderColor="border-l-violet-400"
              />
              <KpiCard
                title="Completion Rate"
                value={fmtPct(summary.completionRate)}
                icon={TrendingUp}
                iconColor="text-emerald-400"
                borderColor="border-l-emerald-400"
                subtitle={<span className="text-[10px] text-content-muted font-mono">of operational volume</span>}
              />
              <KpiCard
                title="No-Show Rate"
                value={fmtPct(summary.noShowRate)}
                icon={AlertTriangle}
                iconColor="text-amber-400"
                borderColor="border-l-amber-400"
                subtitle={<span className="text-[10px] text-content-muted font-mono">of operational volume</span>}
              />
              <KpiCard
                title="Cancellation Rate"
                value={fmtPct(summary.cancellationRate)}
                icon={AlertTriangle}
                iconColor="text-red-400"
                borderColor="border-l-red-400"
                subtitle={<span className="text-[10px] text-content-muted font-mono">of operational volume</span>}
              />
              <KpiCard
                title="Current Queue Load"
                value={summary.currentQueueLoad}
                icon={Users}
                iconColor="text-content-primary"
                borderColor="border-l-content-primary"
                subtitle={<span className="text-[10px] text-[#f54e00] font-mono font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f54e00] animate-pulse" />Live Snapshot</span>}
              />
            </div>
          </div>

          {/* ── Queue-Level Breakdown ─────────────────────────────────────── */}
          <div className="bg-surface-elevated rounded-lg border border-border-subtle shadow-sm overflow-hidden" id="analytics-queue-table">
            <div className="p-5 border-b border-border-strong">
              <h2 className="text-sm font-bold text-content-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Queue-Level Operational Breakdown
              </h2>
            </div>
            {queueData.length === 0 ? (
              <div className="p-10 text-center text-sm text-content-muted font-mono">
                No queue-level data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="bg-surface-interactive text-content-secondary font-mono uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3 px-5 font-semibold">Queue</th>
                      <th className="text-right py-3 px-4 font-semibold">Op. Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold">Completed</th>
                      <th className="text-right py-3 px-4 font-semibold">No-Shows</th>
                      <th className="text-right py-3 px-4 font-semibold">Cancellations</th>
                      <th className="text-right py-3 px-4 font-semibold">Transfers</th>
                      <th className="text-right py-3 px-4 font-semibold">Completion %</th>
                      <th className="text-right py-3 px-4 font-semibold">No-Show %</th>
                      <th className="text-right py-3 px-4 font-semibold">Cancel %</th>
                      <th className="text-right py-3 px-4 font-semibold">Current Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueData.map((q, idx) => (
                      <tr key={q.queueId} className={`border-t border-border-strong hover:bg-surface-interactive transition-colors ${idx % 2 === 0 ? '' : 'bg-surface-interactive/30'}`}>
                        <td className="py-3 px-5 font-medium text-content-primary">{q.queueName}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold text-content-primary">{q.operationalTokenVolume}</td>
                        <td className="text-right py-3 px-4 font-mono text-emerald-400">{q.completedTokens}</td>
                        <td className="text-right py-3 px-4 font-mono text-amber-400">{q.noShows}</td>
                        <td className="text-right py-3 px-4 font-mono text-red-400">{q.cancellations}</td>
                        <td className="text-right py-3 px-4 font-mono text-violet-400">{q.transfers}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold">{fmtPct(q.completionRate)}</td>
                        <td className="text-right py-3 px-4 font-mono">{fmtPct(q.noShowRate)}</td>
                        <td className="text-right py-3 px-4 font-mono">{fmtPct(q.cancellationRate)}</td>
                        <td className="text-right py-3 px-4">
                          <span className="font-mono font-bold text-content-primary bg-surface-interactive border border-border-strong px-2 py-0.5 rounded text-[10px]">
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
          <div className="bg-surface-elevated rounded-lg border border-border-subtle shadow-sm overflow-hidden" id="analytics-staff-table">
            <div className="p-5 border-b border-border-strong">
              <h2 className="text-sm font-bold text-content-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Calling-Staff Average Service Duration
              </h2>
              <p className="text-[10px] text-content-muted font-mono mt-1">
                Average time between service start and completion per calling staff member.
              </p>
            </div>
            {staffData.length === 0 ? (
              <div className="p-10 text-center text-sm text-content-muted font-mono">
                No staff service duration data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="bg-surface-interactive text-content-secondary font-mono uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3 px-5 font-semibold">Staff</th>
                      <th className="text-right py-3 px-5 font-semibold">Completed Segments</th>
                      <th className="text-right py-3 px-5 font-semibold">Avg. Service Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffData.map((s, idx) => (
                      <tr key={s.staffId} className={`border-t border-border-strong hover:bg-surface-interactive transition-colors ${idx % 2 === 0 ? '' : 'bg-surface-interactive/30'}`}>
                        <td className="py-3 px-5 font-medium text-content-primary">{s.staffName ?? s.staffId}</td>
                        <td className="text-right py-3 px-5 font-mono font-bold text-content-primary">{s.completedSegments}</td>
                        <td className="text-right py-3 px-5">
                          <span className="font-mono font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-[10px]">
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
          {/* ── Traffic Analytics ─────────────────────────────────────── */}
          {trafficData && (
            <div className="bg-surface-elevated rounded-lg border border-border-subtle shadow-sm overflow-hidden" id="analytics-traffic-chart">
              <div className="p-5 border-b border-border-strong">
                <h2 className="text-sm font-bold text-content-primary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Traffic Volume ({dateRange === 'TODAY' || dateRange === 'YESTERDAY' ? 'Hourly' : 'Daily'})
                </h2>
              </div>
              <div className="p-5 h-[300px]">
                {(dateRange === 'TODAY' || dateRange === 'YESTERDAY' ? trafficData.hourlyBuckets.length : trafficData.dailyBuckets.length) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dateRange === 'TODAY' || dateRange === 'YESTERDAY' ? trafficData.hourlyBuckets.map(b => ({ label: `${String(b.hour).padStart(2, '0')}:00`, volume: b.tokensJoined })) : trafficData.dailyBuckets.map(b => ({ label: b.date.split('T')[0], volume: b.tokensJoined }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-content-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-content-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--color-surface-interactive)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-content-primary)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="volume" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-content-muted text-sm font-mono">No traffic data</div>
                )}
              </div>
            </div>
          )}

          {/* ── Service-Level Breakdown ─────────────────────────────────────── */}
          <div className="bg-surface-elevated rounded-lg border border-border-subtle shadow-sm overflow-hidden" id="analytics-service-table">
            <div className="p-5 border-b border-border-strong">
              <h2 className="text-sm font-bold text-content-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Service-Level Operational Breakdown
              </h2>
            </div>
            {serviceData.length === 0 ? (
              <div className="p-10 text-center text-sm text-content-muted font-mono">
                No service-level data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="bg-surface-interactive text-content-secondary font-mono uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3 px-5 font-semibold">Service</th>
                      <th className="text-right py-3 px-4 font-semibold">Op. Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold">Completed</th>
                      <th className="text-right py-3 px-4 font-semibold">No-Shows</th>
                      <th className="text-right py-3 px-4 font-semibold">Cancellations</th>
                      <th className="text-right py-3 px-4 font-semibold">Transfers</th>
                      <th className="text-right py-3 px-4 font-semibold">Completion %</th>
                      <th className="text-right py-3 px-4 font-semibold">No-Show %</th>
                      <th className="text-right py-3 px-4 font-semibold">Cancel %</th>
                      <th className="text-right py-3 px-4 font-semibold">Avg. Svc Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceData.map((s, idx) => (
                      <tr key={s.serviceId} className={`border-t border-border-strong hover:bg-surface-interactive transition-colors ${idx % 2 === 0 ? '' : 'bg-surface-interactive/30'}`}>
                        <td className="py-3 px-5 font-medium text-content-primary">{s.serviceName}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold text-content-primary">{s.operationalTokenVolume}</td>
                        <td className="text-right py-3 px-4 font-mono text-emerald-400">{s.completedTokens}</td>
                        <td className="text-right py-3 px-4 font-mono text-amber-400">{s.noShows}</td>
                        <td className="text-right py-3 px-4 font-mono text-red-400">{s.cancellations}</td>
                        <td className="text-right py-3 px-4 font-mono text-violet-400">{s.transfers}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold">{fmtPct(s.completionRate)}</td>
                        <td className="text-right py-3 px-4 font-mono">{fmtPct(s.noShowRate)}</td>
                        <td className="text-right py-3 px-4 font-mono">{fmtPct(s.cancellationRate)}</td>
                        <td className="text-right py-3 px-4">
                          <span className="font-mono font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-[10px]">
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

          {/* ── Counter-Level Breakdown ─────────────────────────────────────── */}
          <div className="bg-surface-elevated rounded-lg border border-border-subtle shadow-sm overflow-hidden" id="analytics-counter-table">
            <div className="p-5 border-b border-border-strong">
              <h2 className="text-sm font-bold text-content-primary flex items-center gap-2">
                <Monitor className="w-4 h-4 text-accent" />
                Counter-Level Operational Breakdown
              </h2>
            </div>
            {counterData.length === 0 ? (
              <div className="p-10 text-center text-sm text-content-muted font-mono">
                No counter-level data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="bg-surface-interactive text-content-secondary font-mono uppercase text-[10px] tracking-wider">
                      <th className="text-left py-3 px-5 font-semibold">Counter</th>
                      <th className="text-right py-3 px-4 font-semibold">Op. Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold">Completed</th>
                      <th className="text-right py-3 px-4 font-semibold">No-Shows</th>
                      <th className="text-right py-3 px-4 font-semibold">Cancellations</th>
                      <th className="text-right py-3 px-4 font-semibold">Transfers</th>
                      <th className="text-right py-3 px-4 font-semibold">Avg. Svc Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counterData.map((c, idx) => (
                      <tr key={c.counterId} className={`border-t border-border-strong hover:bg-surface-interactive transition-colors ${idx % 2 === 0 ? '' : 'bg-surface-interactive/30'}`}>
                        <td className="py-3 px-5 font-medium text-content-primary">{c.counterName}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold text-content-primary">{c.operationalTokenVolume}</td>
                        <td className="text-right py-3 px-4 font-mono text-emerald-400">{c.completedTokens}</td>
                        <td className="text-right py-3 px-4 font-mono text-amber-400">{c.noShows}</td>
                        <td className="text-right py-3 px-4 font-mono text-red-400">{c.cancellations}</td>
                        <td className="text-right py-3 px-4 font-mono text-violet-400">{c.transfers}</td>
                        <td className="text-right py-3 px-4">
                          <span className="font-mono font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-[10px]">
                            {fmtDuration(c.averageServiceDurationSeconds)}
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
    </AuthGuard>
  );
};
