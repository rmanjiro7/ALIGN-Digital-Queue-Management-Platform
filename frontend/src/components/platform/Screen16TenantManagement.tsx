import React, { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { queueStore, AppState } from '../../services/store';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Screen16TenantManagementProps {
  appState: AppState;
}

export const Screen16TenantManagement: React.FC<Screen16TenantManagementProps> = ({ appState }) => {
  const { info } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('Healthcare');
  const [orgEmail, setOrgEmail] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTenants = appState.tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.code && t.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalLocations = 'N/A';
  const totalQueues = 'N/A';

  React.useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tenants = await adminApi.getTenants();
      queueStore.setTenants(tenants);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await adminApi.updateTenantStatus(orgId, newStatus);
      await fetchTenants();
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName) return;

    try {
      setIsLoading(true);
      setError(null);
      await adminApi.createTenant({
        name: orgName,
        sector: orgSector,
        status: 'ACTIVE',
        contactEmail: orgEmail || 'admin@' + orgName.toLowerCase().replace(/\s+/g, '') + '.com',
      });
      await fetchTenants();
      setOrgName('');
      setOrgEmail('');
      setShowOnboardModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 bg-[#f7f7f4] min-h-screen text-[#26251e] font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#e6e5e0]">
        <div>
          <div className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#f54e00] mb-1">
            Global Administration / Platform
          </div>
          <h1 className="text-2xl md:text-3xl font-normal font-display text-[#26251e] tracking-tight">
            Tenant Management
          </h1>
          <p className="text-xs text-[#73726c] mt-1">
            Global administration, provisioning, and status control for all registered tenant organizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="onboard-tenant-btn"
            onClick={() => setShowOnboardModal(true)}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            <span>Onboard Tenant</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-mono">
          {error}
        </div>
      )}

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">Total Tenants</span>
            <Icon icon="lucide:building-2" className="w-4 h-4 text-[#f54e00]" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-[#26251e]">{appState.tenants.length}</div>
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Registered organizations</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">Total Locations</span>
            <Icon icon="lucide:map-pin" className="w-4 h-4 text-[#f54e00]" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-[#26251e]">{totalLocations}</div>
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Across all tenants</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">Active Queues</span>
            <Icon icon="lucide:list-ordered" className="w-4 h-4 text-[#f54e00]" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-[#26251e]">{totalQueues}</div>
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Currently operating</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">System Status</span>
            <Icon icon="lucide:shield-check" className="w-4 h-4 text-[#8c8b85]" />
          </div>
          <div>
            <div className="text-xl font-mono font-bold text-[#73726c] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Operational
            </div>
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Cluster verified</div>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Icon icon="lucide:search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b85]" />
            <Input 
              type="text" 
              placeholder="Search organizations or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => info('Filter options: Active only, Suspended, Healthcare, Retail, Government', 'Filter Options')}
              className="flex items-center gap-1.5 text-xs"
            >
              <Icon icon="lucide:filter" className="w-3.5 h-3.5 text-[#73726c]" />
              <span>Filters</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => info('Exporting tenant registry CSV', 'Exporting')}
              className="flex items-center gap-1.5 text-xs"
            >
              <Icon icon="lucide:download" className="w-3.5 h-3.5 text-[#73726c]" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Organizations Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fafaf7] border-b border-[#e6e5e0]">
                  <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider">Organization Name</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider">Sector</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider text-right">Locations</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider text-right">Active Queues</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e5e0]">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#73726c] text-sm">
                      No organizations found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const isActive = tenant.status === 'ACTIVE';
                    return (
                      <tr key={tenant.id} className="hover:bg-[#fafaf7] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-[#fafaf7] border border-[#cfcdc4] flex items-center justify-center font-mono text-xs font-bold text-[#f54e00]">
                              {tenant.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-[#26251e] text-sm">{tenant.name}</div>
                              <div className="text-xs font-mono text-[#8c8b85] mt-0.5">{tenant.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#73726c]">{tenant.sector}</td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-[#26251e]">{'N/A'}</td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-[#26251e]">{'N/A'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={isActive ? 'mint' : 'outline'} className="text-[9px] font-mono">
                            {isActive ? (
                              <Icon icon="lucide:check-circle-2" className="w-3 h-3 mr-1 text-[#2e7d32]" />
                            ) : (
                              <Icon icon="lucide:alert-triangle" className="w-3 h-3 mr-1 text-red-600" />
                            )}
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                              className={`text-xs ${isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'}`}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                queueStore.selectOrg(tenant.id);
                                queueStore.setScreen('SCREEN_17_ANALYTICS');
                              }}
                              className="text-xs"
                              title="View Tenant Analytics"
                            >
                              Analytics
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-[#e6e5e0] flex items-center justify-between text-xs text-[#73726c] bg-[#fafaf7]">
            <span className="font-mono text-[11px]">Showing 1 to {filteredTenants.length} of {appState.tenants.length} tenants</span>
            <div className="flex items-center gap-1.5 font-mono">
              <Button variant="ghost" size="icon" className="w-7 h-7 text-[#73726c] disabled:opacity-50">
                <Icon icon="lucide:chevron-left" className="w-4 h-4" />
              </Button>
              <span className="px-2 py-0.5 font-bold text-xs text-[#26251e] bg-white border border-[#e6e5e0] rounded">1</span>
              <Button variant="ghost" size="icon" className="w-7 h-7 text-[#73726c]">
                <Icon icon="lucide:chevron-right" className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Onboard Tenant Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-normal font-display text-[#26251e] mb-1">Onboard New Organization</h2>
            <p className="text-xs text-[#73726c] mb-6 border-b border-[#e6e5e0] pb-4">Provision a new isolated organization node on ALIGN.</p>

            <form onSubmit={handleOnboardTenant} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-[#73726c] uppercase tracking-wider block mb-1.5">Organization Name *</label>
                <Input 
                  type="text" 
                  required
                  placeholder="e.g. Metro Transit Authority" 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#73726c] uppercase tracking-wider block mb-1.5">Industry Sector</label>
                <select 
                  value={orgSector}
                  onChange={(e) => setOrgSector(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfcdc4] rounded-md text-sm text-[#26251e] focus:outline-none focus:border-[#26251e] appearance-none"
                >
                  <option value="Healthcare">Healthcare &amp; Clinical</option>
                  <option value="Enterprise Retail">Enterprise Retail &amp; Banking</option>
                  <option value="Government">Government &amp; Civic Services</option>
                  <option value="Corporate">Corporate Campus</option>
                  <option value="Education">Education &amp; Universities</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#73726c] uppercase tracking-wider block mb-1.5">Admin Contact Email</label>
                <Input 
                  type="email" 
                  placeholder="ops@orgname.com" 
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#e6e5e0] mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOnboardModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Provisioning...' : 'Provision'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
