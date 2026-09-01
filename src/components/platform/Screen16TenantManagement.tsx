import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';

interface Screen16TenantManagementProps {
  appState: AppState;
}

export const Screen16TenantManagement: React.FC<Screen16TenantManagementProps> = ({ appState }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('Healthcare');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgLocCount, setOrgLocCount] = useState(5);

  const filteredTenants = appState.tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOnboardTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName) return;

    queueStore.onboardTenant({
      name: orgName,
      sector: orgSector,
      status: 'ACTIVE',
      locationCount: orgLocCount,
      activeQueueCount: orgLocCount * 4,
      contactEmail: orgEmail || 'admin@' + orgName.toLowerCase().replace(/\s+/g, '') + '.com',
    });

    setOrgName('');
    setOrgEmail('');
    setShowOnboardModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
            ALIGN Super-Admin Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Platform Operations &amp; Tenant Management
          </h1>
          <p className="text-xs text-slate-500">
            Manage multi-tenant enterprise organizations, quota partitions, and cluster assignments.
          </p>
        </div>

        <button
          id="onboard-tenant-btn"
          onClick={() => setShowOnboardModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00ACC1]/25 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Organization</span>
        </button>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Tenants</div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A] mt-0.5">{appState.tenants.length + 137}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Active Queues</div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A] mt-0.5">1,048</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-[#00ACC1]">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Locations</div>
          <div className="text-2xl md:text-3xl font-black text-[#0F172A] mt-0.5">356</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">System Status</div>
          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Optimal (0 incidents)</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search organizations or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => alert('Filter options: Active only, Suspended, Healthcare, Retail, Government')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters</span>
            </button>
            <button 
              onClick={() => alert('Exporting tenant registry CSV')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase font-bold">
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4">Locations</th>
                <th className="py-3 px-4">Active Queues</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTenants.map((tenant) => {
                const isActive = tenant.status === 'ACTIVE';
                return (
                  <tr key={tenant.id} className="hover:bg-[#F1F5F9]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#00ACC1] flex items-center justify-center font-bold font-mono text-xs shadow-xs">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{tenant.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-semibold">{tenant.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{tenant.sector}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold">{tenant.locationCount}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A]">{tenant.activeQueueCount}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                        isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          queueStore.selectOrg(tenant.id);
                          queueStore.setRole('ORG_ADMIN');
                          queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Manage Tenant
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing 1 to {filteredTenants.length} of 142 tenants</span>
          <div className="flex items-center gap-1.5">
            <button className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 py-1 font-mono text-[#0F172A] font-bold">1</span>
            <button className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Onboard Tenant Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
            <h2 className="text-lg font-black text-[#0F172A] mb-1">Onboard New Enterprise Tenant</h2>
            <p className="text-xs text-slate-500 mb-4">Provision a new isolated organization node on ALIGN.</p>

            <form onSubmit={handleOnboardTenant} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Organization Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Metro Transit Authority" 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Industry Sector</label>
                <select 
                  value={orgSector}
                  onChange={(e) => setOrgSector(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                >
                  <option value="Healthcare">Healthcare &amp; Clinical</option>
                  <option value="Enterprise Retail">Enterprise Retail &amp; Banking</option>
                  <option value="Government">Government &amp; Civic Services</option>
                  <option value="Corporate">Corporate Campus</option>
                  <option value="Education">Education &amp; Universities</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Admin Contact Email</label>
                <input 
                  type="email" 
                  placeholder="ops@orgname.com" 
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
