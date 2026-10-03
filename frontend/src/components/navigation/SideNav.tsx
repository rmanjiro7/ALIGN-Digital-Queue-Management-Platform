import React from 'react';
import { 
  Home, 
  ListOrdered, 
  Users, 
  Settings, 
  BarChart3, 
  Radio, 
  MapPin, 
  ShieldCheck, 
  HelpCircle, 
  LogOut,
  Building,
  Layers,
  ChevronRight
} from 'lucide-react';
import { queueStore, AppState } from '../../services/store';
import { ScreenId } from '../../types';

interface SideNavProps {
  appState: AppState;
}

export const SideNav: React.FC<SideNavProps> = ({ appState }) => {
  const currentRole = appState.currentRole;
  const currentScreen = appState.currentScreen;
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  // Role specific menu items
  const renderNavLinks = () => {
    if (currentRole === 'STAFF') {
      const items: { id: ScreenId; label: string; icon: React.ReactNode; badge?: string }[] = [
        { id: 'SCREEN_09_STAFF_OPERATIONS', label: 'Live Queue Operations', icon: <ListOrdered className="w-4 h-4" />, badge: 'Active' },
        { id: 'SCREEN_11_ANNOUNCEMENT_CONTROL', label: 'Announcement Control', icon: <Radio className="w-4 h-4" /> },
        { id: 'SCREEN_12_ORG_DASHBOARD', label: 'Branch Analytics', icon: <BarChart3 className="w-4 h-4" /> },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`staff-nav-${item.id.toLowerCase()}`}
            onClick={() => queueStore.setScreen(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1 rounded text-sm font-medium transition-colors cursor-pointer border border-transparent ${
              isActive 
                ? 'bg-surface-elevated text-content-primary border-border-subtle shadow-sm' 
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-interactive'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-accent' : 'text-content-muted'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wide uppercase ${
                isActive ? 'bg-accent/15 text-accent' : 'bg-success/15 text-success'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      });
    }

    if (currentRole === 'ORG_ADMIN') {
      const items: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
        { id: 'SCREEN_12_ORG_DASHBOARD', label: 'Overview Dashboard', icon: <Home className="w-4 h-4" /> },
        { id: 'SCREEN_13_LOCATION_MANAGEMENT', label: 'Locations & Branches', icon: <MapPin className="w-4 h-4" /> },
        { id: 'SCREEN_14_SERVICE_QUEUE_CONFIG', label: 'Service & Queue Settings', icon: <Settings className="w-4 h-4" /> },
        { id: 'SCREEN_17_ANALYTICS', label: 'Analytics & Reporting', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'SCREEN_09_STAFF_OPERATIONS', label: 'Switch to Live Queue', icon: <ListOrdered className="w-4 h-4" /> },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`org-nav-${item.id.toLowerCase()}`}
            onClick={() => queueStore.setScreen(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1 rounded text-sm font-medium transition-colors cursor-pointer border border-transparent ${
              isActive 
                ? 'bg-surface-elevated text-content-primary border-border-subtle shadow-sm' 
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-interactive'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-accent' : 'text-content-muted'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-content-muted" />}
          </button>
        );
      });
    }

    if (currentRole === 'PLATFORM_ADMIN') {
      const items: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
        { id: 'SCREEN_15_PLATFORM_DASHBOARD', label: 'Global Platform Overview', icon: <Layers className="w-4 h-4" /> },
        { id: 'SCREEN_16_TENANT_MANAGEMENT', label: 'Tenant Management', icon: <Building className="w-4 h-4" /> },
        { id: 'SCREEN_17_ANALYTICS', label: 'Analytics & Reporting', icon: <BarChart3 className="w-4 h-4" /> },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`platform-nav-${item.id.toLowerCase()}`}
            onClick={() => queueStore.setScreen(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1 rounded text-sm font-medium transition-colors cursor-pointer border border-transparent ${
              isActive 
                ? 'bg-surface-elevated text-content-primary border-border-subtle shadow-sm' 
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-interactive'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-accent' : 'text-content-muted'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-content-muted" />}
          </button>
        );
      });
    }

    return null;
  };

  return (
    <aside className="w-64 bg-surface flex flex-col flex-shrink-0 justify-between text-content-primary min-h-[calc(100vh-64px)] border-r border-border-subtle select-none">
      <div>
        {/* Brand Header */}
        <div className="px-6 py-8 flex items-center gap-3 border-b border-border-subtle mb-6">
          <div className="w-8 h-8 border border-border-strong rounded flex items-center justify-center font-semibold text-content-primary italic">
            A
          </div>
          <div>
            <span className="text-sm font-semibold tracking-wide text-content-primary leading-none block uppercase">ALIGN</span>
            <span className="text-[10px] text-content-muted font-mono tracking-widest uppercase mt-1 block">Console</span>
          </div>
        </div>

        {/* Branch Context Profile Banner */}
        <div className="mx-4 mb-8 px-4 py-3 bg-surface-elevated border border-border-subtle rounded">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded border border-border-strong bg-base text-content-secondary flex items-center justify-center font-mono text-xs">
              {currentOrg.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-medium text-xs text-content-primary truncate">{currentLocation.name}</div>
              <div className="text-[10px] text-content-muted truncate">{currentLocation.subtitle}</div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="px-4">
          <div className="text-[10px] font-mono font-medium text-content-muted uppercase tracking-widest px-1 mb-4">
            Navigation
          </div>
          {renderNavLinks()}
        </nav>
      </div>

      {/* System Status and Support Footer */}
      <div className="p-4 border-t border-border-subtle">
        {/* System Status Pill */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-base border border-border-subtle rounded mb-4">
          <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span className="font-mono tracking-widest text-[10px] text-content-secondary uppercase">System Online</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between text-xs text-content-muted px-1">
          <button 
            onClick={() => alert('ALIGN Queue Management Platform Help & Documentation')}
            className="flex items-center gap-1.5 hover:text-content-primary transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support</span>
          </button>
          <button 
            onClick={() => queueStore.setRole('CUSTOMER')}
            className="flex items-center gap-1.5 text-content-secondary hover:text-content-primary transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
