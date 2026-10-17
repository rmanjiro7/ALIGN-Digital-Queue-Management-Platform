import React, { useState, useEffect, useCallback, useRef } from 'react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { ServiceItem } from '../../types';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeletonizer } from '../common/Skeletonizer';

interface Screen03ServicesProps {
  appState: AppState;
}

export const Screen03Services: React.FC<Screen03ServicesProps> = ({ appState }) => {
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];
  const targetLocationId = appState.selectedLocationId || currentLocation?.id;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequestId = useRef(0);
  const activeLocationId = useRef<string | undefined>(targetLocationId);
  activeLocationId.current = targetLocationId;

  const fetchLocationServices = useCallback(async (locationId: string) => {
    if (!locationId) return;
    const requestId = ++activeRequestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getServices(locationId);
      if (requestId !== activeRequestId.current || activeLocationId.current !== locationId) return;

      const mappedServices: ServiceItem[] = (Array.isArray(data) ? data : []).flatMap((s: any) => {
        if (
          typeof s?.id !== 'string' || !s.id.trim() ||
          typeof s.orgId !== 'string' || !s.orgId.trim() ||
          typeof s.locationId !== 'string' || !s.locationId.trim()
        ) {
          return [];
        }

        return [{
          id: s.id,
          orgId: s.orgId,
          locationId: s.locationId,
          name: s.name,
          description: s.description || '',
          icon: s.icon || 'info',
          enabled: s.enabled ?? true,
          isFastTrack: s.isFastTrack ?? s.fastTrack ?? false,
          isHighVolume: s.isHighVolume ?? s.highVolume ?? false,
          waitingCount: typeof s.waitingCount === 'number' ? s.waitingCount : 0,
          estWaitMins: typeof s.estWaitMins === 'number' ? s.estWaitMins : 0,
          estWaitRange: s.estWaitRange || '',
          confidence: s.confidence || 'Medium',
          associatedQueues: s.associatedQueues || [],
          preparationGuidance: s.preparationGuidance || ''
        }];
      });

      // Preserve services belonging to other locations in store, while updating this location's services
      const otherLocationServices = queueStore.getState().services.filter(
        s => s.locationId !== locationId
      );
      queueStore.setServices([...otherLocationServices, ...mappedServices]);
    } catch (err: any) {
      if (requestId !== activeRequestId.current || activeLocationId.current !== locationId) return;
      console.error('[Customer Services] Failed to load services:', err);
      setError(err.message || 'Failed to load services for this location');
    } finally {
      if (requestId === activeRequestId.current && activeLocationId.current === locationId) {
        setIsLoading(false);
      }
    }
  }, [appState.selectedOrgId]);

  useEffect(() => {
    if (targetLocationId) {
      fetchLocationServices(targetLocationId);
    }
  }, [targetLocationId, fetchLocationServices]);

  const displayServices = appState.services.filter(
    s => s.locationId === targetLocationId &&
      (!appState.selectedOrgId || s.orgId === appState.selectedOrgId) &&
      (s.enabled ?? true)
  );

  const handleJoinService = (serviceId: string) => {
    queueStore.selectService(serviceId);
    queueStore.setScreen('SCREEN_04_JOIN_CONFIRM');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Top Location Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e6e5e0]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
            className="p-2 rounded-md text-[#5a5852] hover:text-[#26251e] hover:bg-white border border-transparent hover:border-[#e6e5e0] transition-colors cursor-pointer"
            title="Back to Discovery"
          >
            <Icon icon="lucide:arrow-left" className="w-5 h-5" />
          </button>

          <div>
            <div className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#807d72] mb-0.5">
              {currentOrg?.name} <span className="text-[#cfcdc4] mx-1">/</span> {currentLocation?.name}
            </div>
            <h1 className="text-display-md text-[#26251e]">
              Select a Service
            </h1>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => queueStore.setScreen('SCREEN_02_DISCOVERY')}
        >
          Change Location
        </Button>
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-white border border-[#e6e5e0] rounded-lg flex items-start gap-3 mb-6">
        <Icon icon="lucide:info" className="w-4 h-4 text-[#f54e00] shrink-0 mt-0.5" />
        <div className="text-xs text-[#5a5852] leading-relaxed">
          <span className="font-semibold text-[#26251e]">Live Queue Telemetry: </span>
          Real-time queue estimates are synchronized with counter activity. Select a service to join the virtual line.
        </div>
      </div>

      {/* Services Grid or Skeletons */}
      {isLoading ? (
        <Skeletonizer type="services" count={4} />
      ) : error ? (
        <Card className="p-8 text-center border border-[#cf2d56]/30 bg-white">
          <Icon icon="lucide:alert-circle" className="w-10 h-10 text-[#cf2d56] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#26251e] mb-1">Unable to load services</p>
          <p className="text-xs text-[#5a5852] mb-4">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => targetLocationId && fetchLocationServices(targetLocationId)}
          >
            Retry Connection
          </Button>
        </Card>
      ) : displayServices.length === 0 ? (
        <Card className="p-12 text-center bg-white">
          <Icon icon="lucide:users" className="w-10 h-10 mx-auto text-[#807d72] mb-3" />
          <p className="text-sm font-semibold text-[#26251e]">No services currently available</p>
          <p className="text-xs text-[#807d72] mt-1">There are currently no active queues configured at this location.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayServices.map((service) => (
            <Card
              key={service.id}
              id={`service-card-${service.id}`}
              variant="interactive"
              className="p-6 flex flex-col justify-between group"
              onClick={() => handleJoinService(service.id)}
            >
              <div>
                {/* Header with Title and Badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-base font-semibold text-[#26251e] group-hover:text-[#f54e00] transition-colors">
                    {service.name}
                  </h2>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {service.isFastTrack && (
                      <Badge variant="read" size="sm">
                        <Icon icon="lucide:zap" className="w-2.5 h-2.5 mr-0.5" />
                        Fast Track
                      </Badge>
                    )}
                    {service.isHighVolume && (
                      <Badge variant="thinking" size="sm">
                        High Volume
                      </Badge>
                    )}
                    {!service.isFastTrack && !service.isHighVolume && (
                      <Badge variant="grep" size="sm">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#5a5852] line-clamp-2 mb-4 leading-relaxed">
                  {service.description}
                </p>

                {/* Wait & People Metrics */}
                <div className="grid grid-cols-2 gap-3 bg-[#fafaf7] p-3.5 rounded-md border border-[#e6e5e0] mb-5">
                  <div className="flex items-start gap-2">
                    <Icon icon="lucide:users" className="w-4 h-4 text-[#807d72] mt-0.5" />
                    <div>
                      <div className="text-[10px] text-[#807d72] uppercase font-mono tracking-wider">In Line</div>
                      <div className="text-xs font-semibold text-[#26251e] mt-0.5 font-mono">
                        {typeof service.waitingCount !== 'number' || isNaN(service.waitingCount)
                          ? '0 queued'
                          : `${service.waitingCount} waiting`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Icon icon="lucide:clock" className="w-4 h-4 text-[#807d72] mt-0.5" />
                    <div>
                      <div className="text-[10px] text-[#807d72] uppercase font-mono tracking-wider">Est. Wait</div>
                      <div className="text-xs font-semibold text-[#26251e] mt-0.5 font-mono">
                        {!service.estWaitRange || service.estWaitRange.trim() === ''
                          ? 'Available Now'
                          : service.estWaitRange}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                id={`join-service-btn-${service.id}`}
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinService(service.id);
                }}
                className="w-full h-10 text-xs uppercase tracking-wider font-semibold"
              >
                <span>Join Virtual Line</span>
                <Icon icon="lucide:chevron-right" className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
