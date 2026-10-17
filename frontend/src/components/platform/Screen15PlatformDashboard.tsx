import React from 'react';
import { queueStore, AppState } from '../../services/store';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Screen15PlatformDashboardProps {
  appState: AppState;
}

export const Screen15PlatformDashboard: React.FC<Screen15PlatformDashboardProps> = ({ appState }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const totalLocations = appState.tenants.reduce((acc, t) => acc + (t.locationCount || 0), 0);
  const totalQueues = appState.tenants.reduce((acc, t) => acc + (t.activeQueueCount || 0), 0);
  
  const criticalAlerts = appState.alerts.filter(a => a.severity === 'critical');
  const warningAlerts = appState.alerts.filter(a => a.severity === 'warning');

  const filteredTenants = appState.tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 bg-[#f7f7f4] min-h-screen text-[#26251e] font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#e6e5e0]">
        <div>
          <div className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#f54e00] mb-1">
            Global Administration / Platform
          </div>
          <h1 className="text-2xl md:text-3xl font-normal font-display text-[#26251e] tracking-tight">
            Platform Dashboard
          </h1>
          <p className="text-xs text-[#73726c] mt-1">
            Global telemetry, tenant organizations, and cross-platform infrastructure health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="manage-tenants-btn"
            onClick={() => queueStore.setScreen('SCREEN_16_TENANT_MANAGEMENT')}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Icon icon="lucide:settings" className="w-4 h-4 text-[#73726c]" />
            <span>Manage Tenants</span>
          </Button>
        </div>
      </div>

      {/* 4 Global KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">Total Organizations</span>
            <Icon icon="lucide:building-2" className="w-4 h-4 text-[#f54e00]" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-[#26251e]">{appState.tenants.length}</div>
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Registered tenants</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">Active Locations</span>
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
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Across all locations</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#73726c] mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">System Health</span>
            <Icon icon="lucide:activity" className="w-4 h-4 text-[#8c8b85]" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-[#73726c]">
              <span>Standby</span>
            </div>
            <div className="text-xs text-[#8c8b85] mt-1 font-mono">Telemetry active</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left: Tenant Overview Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal font-display text-[#26251e]">Organizations Overview</h2>
            <div className="relative">
              <Icon icon="lucide:search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b85]" />
              <Input 
                type="text" 
                placeholder="Search organizations..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs w-64"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafaf7] border-b border-[#e6e5e0]">
                    <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider">Organization</th>
                    <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider text-right">Locations</th>
                    <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider text-right">Queues</th>
                    <th className="px-4 py-3 text-[10px] font-mono font-medium text-[#73726c] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e5e0]">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#73726c] text-sm">
                        No organizations found matching "{searchTerm}"
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-[#fafaf7] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#26251e] text-sm">{tenant.name}</div>
                          <div className="text-xs text-[#8c8b85]">{tenant.sector}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-[#73726c] font-medium">{tenant.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tenant.status === 'ACTIVE' ? 'mint' : 'outline'} className="text-[9px] font-mono">
                            {tenant.status === 'ACTIVE' && <Icon icon="lucide:check-circle-2" className="w-3 h-3 mr-1 text-[#2e7d32]" />}
                            {tenant.status === 'SUSPENDED' && <Icon icon="lucide:alert-triangle" className="w-3 h-3 mr-1 text-amber-600" />}
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-[#26251e]">
                          {tenant.locationCount}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-[#26251e]">
                          {tenant.activeQueueCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="text-[#f54e00] hover:text-[#d04200]"
                            onClick={() => queueStore.setScreen('SCREEN_16_TENANT_MANAGEMENT')}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Attention / Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal font-display text-[#26251e]">System Telemetry</h2>
          </div>

          <div className="space-y-3">
            <Card className="p-5 text-center text-[#73726c]">
              <div className="w-10 h-10 bg-[#fafaf7] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#e6e5e0]">
                <Icon icon="lucide:activity" className="w-5 h-5 text-[#f54e00]" />
              </div>
              <p className="text-xs font-medium text-[#26251e]">Core Services Operational</p>
              <p className="text-[11px] text-[#8c8b85] font-mono mt-1">Multi-tenant routing and isolated DB clusters connected.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
