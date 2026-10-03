import React, { useState } from 'react';
import { 
  Search, 
  QrCode, 
  MapPin, 
  Clock, 
  Building2, 
  ChevronRight, 
  Navigation,
  Compass,
  History
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';

interface Screen02DiscoveryProps {
  appState: AppState;
}

export const Screen02Discovery: React.FC<Screen02DiscoveryProps> = ({ appState }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScannerModal, setShowScannerModal] = useState(false);

  const organizations = [
    {
      id: 'e2e00000-0000-0000-0000-000000000001',
      locationId: 'e2e00000-0000-0000-0000-000000000002',
      name: 'ABC Bank - Main Branch',
      sector: 'Financial Services',
      address: '123 Financial District, Suite 100',
      avgWait: '8 min wait',
      activeServices: '4 services available',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeText: 'Low Wait',
    },
    {
      id: 'org-hospital',
      locationId: 'loc-hospital-main',
      name: 'City General Hospital',
      sector: 'Emergency & Outpatient',
      address: '456 Health Way, Metro City',
      avgWait: '45+ min wait',
      activeServices: '6 services available',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'High Demand',
    },
    {
      id: 'org-rmv',
      locationId: 'loc-rmv-central',
      name: 'Metro RMV Services',
      sector: 'Licensing & Registration',
      address: '789 Civic Center Blvd',
      avgWait: '12 min wait',
      activeServices: '5 services available',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeText: 'Moderate Wait',
    },
    {
      id: 'org-tech',
      locationId: 'loc-main',
      name: 'Global Tech Campus',
      sector: 'Corporate IT & Badging',
      address: '100 Silicon Way, Tech Park',
      avgWait: '5 min wait',
      activeServices: '2 services available',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeText: 'Fast Service',
    }
  ];

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
    <div className="max-w-xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-accent">
            <Compass className="w-5 h-5 text-accent" />
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-content-muted">Queue Discovery</span>
          </div>

          <button
            id="view-history-shortcut-btn"
            onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
            className="flex items-center gap-1.5 text-xs text-content-primary hover:text-accent bg-surface-interactive px-3.5 py-1.5 rounded-lg border border-border-subtle transition-colors cursor-pointer font-semibold"
          >
            <History className="w-3.5 h-3.5 text-accent" />
            <span>My Tokens</span>
          </button>
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-content-primary tracking-tight">
          Find your location
        </h1>
        <p className="text-sm text-content-secondary mt-1">
          Search for an organization to join their virtual queue.
        </p>
      </div>

      {/* Search & QR Scan Box */}
      <div className="relative flex items-center mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, address, or service..." 
            className="w-full pl-10 pr-12 py-3 bg-surface border border-border-subtle rounded-lg text-sm text-content-primary placeholder-content-muted focus:outline-none focus:border-accent shadow-sm"
          />
        </div>

        <button 
          id="qr-scan-btn"
          onClick={() => setShowScannerModal(true)}
          title="Scan location QR code"
          className="ml-2 p-3 bg-surface hover:bg-surface-interactive border border-border-subtle text-accent rounded-lg transition-colors cursor-pointer"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* Location Section Heading */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-content-muted font-semibold">
          Nearby Organizations
        </h2>
        <button 
          onClick={() => alert('Location GPS detected: Metro Central District (Accuracy: 12m)')}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-semibold cursor-pointer transition-colors"
        >
          <Navigation className="w-3 h-3" />
          <span>Use my location</span>
        </button>
      </div>

      {/* Organization Cards List */}
      <div className="space-y-3">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            id={`org-card-${org.id}`}
            onClick={() => handleSelectOrg(org.id, org.locationId)}
            className="bg-surface p-5 rounded-lg border border-border-subtle hover:border-accent hover:bg-surface-interactive transition-all cursor-pointer group relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-lg bg-surface-elevated text-content-primary flex items-center justify-center font-semibold text-sm shrink-0 border border-border-strong">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-content-primary group-hover:text-accent transition-colors">
                    {org.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-content-secondary mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-content-muted shrink-0" />
                    <span className="truncate">{org.address}</span>
                  </div>
                  <div className="text-[11px] text-content-muted mt-1 font-mono">
                    {org.activeServices}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${org.badgeColor.replace('bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-success/10 text-success border-success/30').replace('bg-rose-50 text-rose-700 border-rose-200', 'bg-error/10 text-error border-error/30').replace('bg-amber-50 text-amber-700 border-amber-200', 'bg-warning/10 text-warning border-warning/30').replace('bg-blue-50 text-blue-700 border-blue-200', 'bg-accent/10 text-accent border-accent/30')}`}>
                  {org.badgeText}
                </span>
                <div className="flex items-center gap-1 text-xs text-content-secondary font-semibold font-mono">
                  <Clock className="w-3 h-3 text-content-muted" />
                  <span>{org.avgWait}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-accent font-semibold">
              <span>View Services & Queues</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Scanner Simulation Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg p-6 max-w-sm w-full text-center border border-border-subtle shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-lg bg-surface-elevated flex items-center justify-center text-accent mb-4">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-content-primary mb-1">Simulated QR Code Scanner</h3>
            <p className="text-xs text-content-secondary mb-6">
              In production, scanning a desk QR code instantly loads the organization and branch token queue.
            </p>
            <div className="p-4 bg-surface-elevated rounded-lg border border-border-subtle mb-6 text-left font-mono text-xs space-y-1">
              <div className="text-content-muted">Target QR URL:</div>
              <div className="text-accent font-semibold break-all">https://align.app/q/abc-services/main-branch</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowScannerModal(false)}
                className="flex-1 py-3 rounded-lg border border-border-strong text-xs font-semibold text-content-primary hover:bg-surface-interactive cursor-pointer uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowScannerModal(false);
                  handleSelectOrg('e2e00000-0000-0000-0000-000000000001', 'e2e00000-0000-0000-0000-000000000002');
                }}
                className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-base text-xs font-semibold cursor-pointer uppercase tracking-widest transition-colors"
              >
                Simulate Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
