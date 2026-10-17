import React, { useState } from 'react';
import { queueStore, AppState } from '../../services/store';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface Screen02DiscoveryProps {
  appState: AppState;
}

export const Screen02Discovery: React.FC<Screen02DiscoveryProps> = ({ appState }) => {
  const { info } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showScannerModal, setShowScannerModal] = useState(false);

  const organizations = appState.tenants.map(t => {
    const loc = appState.locations.find(l => l.orgId === t.id) || appState.locations[0];
    const locServices = appState.services.filter(s => s.orgId === t.id && (s.enabled ?? true));
    const totalWaiting = locServices.reduce((acc, s) => acc + (s.waitingCount || 0), 0);
    const avgWait = totalWaiting === 0 ? 'No wait' : `${Math.round(totalWaiting * 3)} min wait`;
    return {
      id: t.id,
      locationId: loc?.id || 'e2e00000-0000-0000-0000-000000000002',
      name: t.name,
      sector: t.sector,
      icon: 'lucide:building-2',
      address: loc?.address || `${loc?.city || 'Metro City'}`,
      avgWait,
      activeServices: `${locServices.length || loc?.activeServicesCount || 0} services available`,
      badgeVariant: totalWaiting === 0 ? ('grep' as const) : totalWaiting > 20 ? ('thinking' as const) : ('done' as const),
      badgeText: totalWaiting === 0 ? 'Available Now' : totalWaiting > 20 ? 'High Demand' : 'Moderate Wait',
    };
  });

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectOrg = (orgId: string, locationId: string) => {
    queueStore.selectOrg(orgId);
    queueStore.selectLocation(locationId);
    queueStore.setScreen('SCREEN_03_SERVICES');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-end mb-3">
          <button
            id="view-history-shortcut-btn"
            onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
            className="flex items-center gap-1.5 text-xs text-[#26251e] hover:text-[#f54e00] bg-white px-3 py-1.5 rounded-md border border-[#e6e5e0] transition-colors cursor-pointer font-medium"
          >
            <Icon icon="lucide:ticket" className="w-3.5 h-3.5 text-[#f54e00]" />
            <span>My Tokens</span>
          </button>
        </div>

        <h1 className="text-display-md text-[#26251e]">
          Find your queue
        </h1>
        <p className="text-sm text-[#5a5852] mt-1.5">
          Select an organization to check estimated wait times and join their digital queue.
        </p>
      </div>

      {/* Search & QR Scan Box */}
      <div className="relative flex items-center gap-2 mb-8">
        <div className="relative flex-1">
          <Icon icon="lucide:search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#807d72]" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, address, or service..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e6e5e0] rounded-md text-sm text-[#26251e] placeholder:text-[#a09c92] focus:outline-none focus:border-[#26251e] transition-colors"
          />
        </div>

        <button 
          id="qr-scan-btn"
          onClick={() => setShowScannerModal(true)}
          title="Scan location QR code"
          className="p-2.5 bg-white hover:bg-[#fafaf7] border border-[#e6e5e0] text-[#26251e] rounded-md transition-colors cursor-pointer"
        >
          <Icon icon="lucide:qr-code" className="w-5 h-5 text-[#f54e00]" />
        </button>
      </div>

      {/* Location Section Heading & List (only when organizations exist) */}
      {filteredOrgs.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#807d72] font-semibold">
              Available Locations ({filteredOrgs.length})
            </h2>
            <button 
              onClick={() => info('Location detected: Metro Central District (Accuracy: 12m)', 'Location Services')}
              className="flex items-center gap-1.5 text-xs text-[#f54e00] hover:text-[#d04200] font-medium cursor-pointer transition-colors"
            >
              <Icon icon="lucide:navigation" className="w-3.5 h-3.5" />
              <span>Near me</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {filteredOrgs.map((org) => (
              <Card
                key={org.id}
                id={`org-card-${org.id}`}
                onClick={() => handleSelectOrg(org.id, org.locationId)}
                variant="interactive"
                className="p-5 group"
              >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md bg-[#fafaf7] text-[#26251e] flex items-center justify-center shrink-0 border border-[#e6e5e0]">
                  <Icon icon={org.icon} className="w-5 h-5 text-[#26251e]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#26251e] group-hover:text-[#f54e00] transition-colors">
                    {org.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#5a5852] mt-1">
                    <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 text-[#807d72] shrink-0" />
                    <span className="truncate">{org.address}</span>
                  </div>
                  <div className="text-[11px] text-[#807d72] mt-1 font-mono">
                    {org.activeServices}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge variant={org.badgeVariant} size="sm">
                  {org.badgeText}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-[#5a5852] font-medium font-mono">
                  <Icon icon="lucide:clock" className="w-3 h-3 text-[#807d72]" />
                  <span>{org.avgWait}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#efeee8] flex items-center justify-between text-xs text-[#f54e00] font-medium">
              <span>Explore services and queues</span>
              <Icon icon="lucide:chevron-right" className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>
    </>
  )}

      {/* Scanner Simulation Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-[#26251e]/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full p-6 text-center border border-[#e6e5e0]">
            <div className="w-12 h-12 mx-auto rounded-lg bg-[#fafaf7] border border-[#e6e5e0] flex items-center justify-center text-[#f54e00] mb-4">
              <Icon icon="lucide:qr-code" className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#26251e] mb-1">Simulated QR Code Scanner</h3>
            <p className="text-xs text-[#5a5852] mb-5">
              In a physical branch, scanning a desk QR code instantly loads the organization and branch token queue.
            </p>
            <div className="p-3.5 bg-[#fafaf7] rounded-md border border-[#e6e5e0] mb-5 text-left font-mono text-xs space-y-1">
              <div className="text-[#807d72]">Target QR URL:</div>
              <div className="text-[#26251e] font-medium break-all">https://align.app/q/abc-bank/main-branch</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowScannerModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowScannerModal(false);
                  handleSelectOrg('e2e00000-0000-0000-0000-000000000001', 'e2e00000-0000-0000-0000-000000000002');
                }}
                className="flex-1"
              >
                Simulate Scan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
