import React, { useState } from 'react';
import { queueStore, AppState } from '../../services/store';
import { CounterAvailability } from '../../types';
import { DateRangeFilter, DateRangePreset } from '../analytics/DateRangeFilter';
import { analyticsApi, AnalyticsOverviewResponse, LegacyAnalyticsTrafficResponse, LegacyServiceAnalyticsResponse } from '../../services/analyticsApi';
import { getDateRange, formatDuration } from '../../utils/dateUtils';
import { AnalyticsBarChart } from '../analytics/AnalyticsBarChart';
import { AnalyticsServiceProgress } from '../analytics/AnalyticsServiceProgress';
import { AuthGuard } from '../common/AuthGuard';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface Screen12OrgDashboardProps {
  appState: AppState;
}

export const Screen12OrgDashboard: React.FC<Screen12OrgDashboardProps> = ({ appState }) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>(appState.selectedLocationId || 'loc-main');
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];

  const [dateRange, setDateRange] = useState<DateRangePreset>('TODAY');
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [traffic, setTraffic] = useState<LegacyAnalyticsTrafficResponse | null>(null);
  const [services, setServices] = useState<LegacyServiceAnalyticsResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { info } = useToast();

  React.useEffect(() => {
    if (appState.authStatus !== 'AUTHENTICATED' && appState.authStatus !== 'AUTH_READY') {
      return;
    }

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
  }, [dateRange, appState.selectedOrgId, selectedLocationId, appState.authStatus]);

  const branchCounters = appState.counters.filter(
    c => c.orgId === appState.selectedOrgId && (c.locationId === selectedLocationId || !c.locationId)
  );

  const getAvailabilityBadge = (availability: CounterAvailability) => {
    switch (availability) {
      case 'ONLINE':
        return (
          <Badge variant="grep" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1f8a65] animate-pulse mr-1" />
            ONLINE
          </Badge>
        );
      case 'ON_BREAK':
        return (
          <Badge variant="done" size="sm">
            <Icon icon="lucide:coffee" className="w-3 h-3 mr-1" />
            BREAK
          </Badge>
        );
      case 'AWAY':
        return (
          <Badge variant="thinking" size="sm">
            <Icon icon="lucide:pause" className="w-3 h-3 mr-1" />
            AWAY
          </Badge>
        );
      case 'OFFLINE':
        return (
          <Badge variant="outline" size="sm">
            <Icon icon="lucide:power" className="w-3 h-3 mr-1" />
            OFFLINE
          </Badge>
        );
    }
  };

  return (
    <AuthGuard appState={appState}>
      <div className="flex-1 bg-[#f7f7f4] overflow-y-auto p-4 md:p-6 lg:p-8 text-[#26251e]">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 pb-6 border-b border-[#e6e5e0]">
            <div>
              <div className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#807d72] mb-1">
                {currentOrg?.name} <span className="text-[#cfcdc4]">/</span> Executive Overview
              </div>
              <h1 className="text-display-md text-[#26251e]">
                Organization Dashboard
              </h1>
              <p className="text-sm text-[#5a5852] mt-1">
                Administrative oversight, live throughput counters, and branch service benchmarks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              
              <Button
                variant="outline"
                size="md"
                onClick={() => info(`Exporting PDF/CSV operations report for ${currentOrg?.name}`, 'Exporting')}
                className="gap-2"
              >
                <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => queueStore.setScreen('SCREEN_13_LOCATION_MANAGEMENT')}
                className="gap-2"
              >
                <span>Locations</span>
                <Icon icon="lucide:chevron-right" className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active Alerts Banner */}
          {appState.queueWarnings && appState.queueWarnings.filter(w => w.capacityWarningActive || w.waitWarningActive).map(warning => {
            const queueName = appState.queues.find(q => q.id === warning.queueId)?.name || 'Unknown Queue';
            const queue = appState.queues.find(q => q.id === warning.queueId);
            if (queue && queue.locationId !== selectedLocationId && selectedLocationId !== 'loc-main') return null;

            return (
              <div key={`alert-${warning.queueId}`} className="bg-[#cf2d56]/10 border border-[#cf2d56]/30 rounded-md p-4 flex items-start gap-3">
                <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-[#cf2d56] shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-[#cf2d56] uppercase tracking-wider text-xs mr-2 font-mono">Operational Alert: {queueName}</span>
                  <span className="text-[#26251e]">
                    {warning.capacityWarningActive && warning.waitWarningActive
                      ? 'is currently experiencing both high capacity and excessive wait times.'
                      : warning.capacityWarningActive
                      ? 'has reached its configured capacity threshold limit.'
                      : 'is currently experiencing excessive wait times beyond the configured threshold limit.'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative">
            {isLoading && (
               <div className="absolute inset-0 bg-[#f7f7f4]/60 backdrop-blur-xs z-10 flex items-center justify-center">
                 <Icon icon="lucide:refresh-cw" className="w-6 h-6 text-[#f54e00] animate-spin" />
               </div>
            )}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#807d72] mb-3">
                  <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">Total Issued</span>
                  <Icon icon="lucide:users" className="w-4 h-4 text-[#807d72]" />
                </div>
                <div className="text-3xl font-medium font-mono text-[#26251e]">
                  {overview?.totalTokensIssued || 0}
                </div>
              </div>
              <div className="text-[10px] text-[#5a5852] font-semibold mt-4 font-mono uppercase tracking-wider">
                Served: {overview?.tokensCompleted || 0}
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#807d72] mb-3">
                  <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">Avg Wait</span>
                  <Icon icon="lucide:clock" className="w-4 h-4 text-[#807d72]" />
                </div>
                <div className="text-3xl font-medium font-mono text-[#26251e]">
                  {formatDuration(overview?.avgWaitTimeSeconds || null)}
                </div>
              </div>
              <div className="text-[10px] text-[#5a5852] font-semibold mt-4 font-mono uppercase tracking-wider">
                Avg Svc: {formatDuration(overview?.avgServiceTimeSeconds || null)}
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#807d72] mb-3">
                  <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">Peak Demand</span>
                  <Icon icon="lucide:zap" className="w-4 h-4 text-[#f54e00]" />
                </div>
                <div className="text-3xl font-medium font-mono text-[#26251e]">
                  {overview?.peakHour !== null && overview?.peakHour !== undefined ? `${overview.peakHour}:00` : '--:--'}
                </div>
              </div>
              <div className="text-[10px] text-[#5a5852] font-semibold mt-4 font-mono uppercase tracking-wider">
                {overview?.peakHourTokenCount || 0} tokens/hr
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#807d72] mb-3">
                  <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">Completion</span>
                  <Icon icon="lucide:check-circle-2" className="w-4 h-4 text-[#1f8a65]" />
                </div>
                <div className="text-3xl font-medium font-mono text-[#1f8a65]">
                  {overview?.totalTokensIssued 
                    ? Math.round((overview.tokensCompleted / overview.totalTokensIssued) * 100) 
                    : 0}%
                </div>
              </div>
              <div className="text-[10px] text-[#5a5852] font-semibold mt-4 font-mono uppercase tracking-wider">
                No-show: {overview?.noShowRate ? Math.round(overview.noShowRate * 100) : 0}%
              </div>
            </Card>
          </div>

          {/* Analytics Bento: Throughput Chart Left, Service Breakdown Right */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            <Card className="xl:col-span-2 p-6 flex flex-col space-y-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#807d72] font-semibold">Throughput vs Completion</h2>
                  <p className="text-xs text-[#5a5852] mt-1">Hourly token issuance compared against service completion rate</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider text-[#807d72] uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#807d72]" /> Issued
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f54e00]" /> Served
                  </span>
                </div>
              </div>

              <div className="h-64 w-full relative flex-1 min-h-[250px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-[#f7f7f4]/60 backdrop-blur-xs z-10 flex items-center justify-center">
                    <Icon icon="lucide:refresh-cw" className="w-6 h-6 text-[#f54e00] animate-spin" />
                  </div>
                )}
                <AnalyticsBarChart data={
                  traffic?.hourlyBuckets?.map(b => ({
                    time: `${b.hour.toString().padStart(2, '0')}:00`,
                    issued: b.tokensJoined,
                    served: b.tokensCompleted
                  })) || []
                } />
              </div>
            </Card>

            <Card className="p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-[#807d72] font-semibold mb-1">Service Allocation</h2>
                <p className="text-xs text-[#5a5852] mb-6">Volume distribution across service queues</p>

                <div className="relative flex-grow min-h-[200px]">
                  {isLoading && (
                    <div className="absolute inset-0 bg-[#f7f7f4]/60 backdrop-blur-xs z-10 flex items-center justify-center">
                      <Icon icon="lucide:refresh-cw" className="w-6 h-6 text-[#f54e00] animate-spin" />
                    </div>
                  )}
                  <AnalyticsServiceProgress data={
                    (() => {
                      if (!services || services.length === 0) return [];
                      const total = services.reduce((sum, s) => sum + s.totalTokens, 0);
                      if (total === 0) return [];
                      const colors = ['#f54e00', '#26251e', '#1f8a65', '#9fbbe0', '#c08532'];
                      return services.slice(0, 5).map((s, i) => ({
                        serviceName: s.serviceName,
                        percentage: (s.totalTokens / total) * 100,
                        color: colors[i % colors.length]
                      }));
                    })()
                  } />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[#efeee8]">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => queueStore.setScreen('SCREEN_14_SERVICE_QUEUE_CONFIG')}
                  className="w-full text-xs uppercase tracking-wider font-semibold"
                >
                  <span>Configure Services &amp; Queues</span>
                  <Icon icon="lucide:arrow-up-right" className="w-3.5 h-3.5 ml-1 text-[#f54e00]" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Branch-Level Counter Monitoring Table */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#efeee8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md border border-[#e6e5e0] bg-[#fafaf7] flex items-center justify-center text-[#26251e]">
                  <Icon icon="lucide:monitor" className="w-5 h-5 text-[#f54e00]" />
                </div>
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#807d72] font-semibold">Live Counter Telemetry</h2>
                  <p className="text-xs text-[#5a5852] mt-0.5">Real-time status, availability, and active token assignments</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#807d72]">Branch:</span>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="bg-white border border-[#e6e5e0] text-xs font-mono font-medium rounded-md px-3 py-1.5 text-[#26251e] focus:outline-none focus:border-[#26251e] cursor-pointer"
                >
                  {appState.locations.filter(l => l.orgId === appState.selectedOrgId).map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#efeee8] text-[10px] font-mono uppercase tracking-wider text-[#807d72] font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">Counter</th>
                    <th className="py-3 px-4 whitespace-nowrap">Operator</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 whitespace-nowrap">Queue State</th>
                    <th className="py-3 px-4 whitespace-nowrap">Active Token</th>
                    <th className="py-3 px-4 whitespace-nowrap">Supported Services</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeee8] text-xs">
                  {branchCounters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#807d72] text-sm italic">
                        No counters found for this location.
                      </td>
                    </tr>
                  ) : branchCounters.map((counter) => {
                    const queueState = queueStore.getCounterQueueState(counter.number);
                    const activeToken = counter.currentServingTokenId
                      ? appState.tokens.find(t => t.id === counter.currentServingTokenId && ['CALLED', 'IN_SERVICE'].includes(t.state))
                      : appState.tokens.find(t => t.counterNumber === counter.number && ['CALLED', 'IN_SERVICE'].includes(t.state));
                    
                    const supportedServices = counter.supportedServiceNames || ['General Inquiry'];

                    return (
                      <tr key={counter.id} className="hover:bg-[#fafaf7] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded border border-[#e6e5e0] bg-[#fafaf7] flex items-center justify-center font-mono font-semibold text-xs text-[#26251e]">
                              {counter.number}
                            </span>
                            <div>
                              <div className="font-medium text-[#26251e]">{counter.name}</div>
                              <div className="text-[10px] text-[#807d72] font-mono mt-0.5">{counter.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-[#5a5852] flex items-center gap-1.5 font-medium">
                            <Icon icon="lucide:user-check" className="w-3.5 h-3.5 text-[#807d72]" />
                            <span>{counter.assignedStaffName || 'Unassigned'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getAvailabilityBadge(counter.availability)}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant={queueState === 'SERVING' ? 'edit' : 'read'} size="sm">
                            {queueState}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          {activeToken ? (
                            <Badge variant="outline" size="sm" className="font-mono text-[#26251e]">
                              {activeToken.tokenNumber} ({activeToken.customerName || 'Guest'})
                            </Badge>
                          ) : (
                            <span className="text-[#807d72] font-mono text-[10px] uppercase">Standby</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {supportedServices.map((srv, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 bg-[#fafaf7] border border-[#e6e5e0] text-[#5a5852] rounded text-[10px] font-mono">
                                {srv}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={counter.availability}
                            onChange={(e) => queueStore.setCounterAvailability(counter.number, e.target.value as CounterAvailability)}
                            className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-white border border-[#e6e5e0] rounded-md px-2.5 py-1 text-[#26251e] hover:border-[#26251e] focus:outline-none cursor-pointer"
                          >
                            <option value="ONLINE">Set ONLINE</option>
                            <option value="ON_BREAK">Set BREAK</option>
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
          </Card>

        </div>
      </div>
    </AuthGuard>
  );
};
