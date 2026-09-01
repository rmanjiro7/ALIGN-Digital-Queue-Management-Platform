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
      id: 'org-abc',
      locationId: 'loc-main',
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
          <div className="flex items-center gap-2 text-[#00ACC1]">
            <Compass className="w-5 h-5 text-[#00ACC1]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Queue Discovery</span>
          </div>

          <button
            id="view-history-shortcut-btn"
            onClick={() => queueStore.setScreen('SCREEN_07_HISTORY')}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-[#00ACC1] bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm transition-colors cursor-pointer font-bold"
          >
            <History className="w-3.5 h-3.5 text-[#00ACC1]" />
            <span>My Tokens</span>
          </button>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
          Find your location
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Search for an organization to join their virtual queue.
        </p>
      </div>

      {/* Search & QR Scan Box */}
      <div className="relative flex items-center mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, address, or service..." 
            className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00ACC1] shadow-sm"
          />
        </div>

        <button 
          id="qr-scan-btn"
          onClick={() => setShowScannerModal(true)}
          title="Scan location QR code"
          className="ml-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 text-[#00ACC1] rounded-2xl shadow-sm transition-colors cursor-pointer"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* Location Section Heading */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
          Nearby Organizations
        </h2>
        <button 
          onClick={() => alert('Location GPS detected: Metro Central District (Accuracy: 12m)')}
          className="flex items-center gap-1 text-xs text-[#00ACC1] hover:underline font-bold cursor-pointer"
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
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#00ACC1] hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                  <Building2 className="w-5 h-5 text-[#00ACC1]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#00ACC1] transition-colors">
                    {org.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{org.address}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {org.activeServices}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${org.badgeColor}`}>
                  {org.badgeText}
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-600 font-bold font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{org.avgWait}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#00ACC1] font-bold">
              <span>View Services & Queues</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Scanner Simulation Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center border border-slate-200 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-[#00ACC1] mb-4">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Simulated QR Code Scanner</h3>
            <p className="text-xs text-slate-600 mb-6">
              In production, scanning a desk QR code instantly loads the organization and branch token queue.
            </p>
            <div className="p-4 bg-[#F1F5F9] rounded-2xl border border-slate-200 mb-6 text-left font-mono text-xs space-y-1">
              <div className="text-slate-500">Target QR URL:</div>
              <div className="text-[#00ACC1] font-bold break-all">https://align.app/q/abc-services/main-branch</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowScannerModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowScannerModal(false);
                  handleSelectOrg('org-abc', 'loc-main');
                }}
                className="flex-1 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer uppercase tracking-wider"
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
