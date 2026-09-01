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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isActive 
                ? 'bg-[#1E293B] text-[#00ACC1] border-l-4 border-[#00ACC1] shadow-sm' 
                : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-[#00ACC1]' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isActive ? 'bg-[#00ACC1]/20 text-[#00ACC1]' : 'bg-emerald-500/20 text-emerald-400'
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
        { id: 'SCREEN_09_STAFF_OPERATIONS', label: 'Switch to Live Queue', icon: <ListOrdered className="w-4 h-4" /> },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`org-nav-${item.id.toLowerCase()}`}
            onClick={() => queueStore.setScreen(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isActive 
                ? 'bg-[#1E293B] text-[#00ACC1] border-l-4 border-[#00ACC1] shadow-sm' 
                : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-[#00ACC1]' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1]" />}
          </button>
        );
      });
    }

    if (currentRole === 'PLATFORM_ADMIN') {
      const items: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
        { id: 'SCREEN_15_PLATFORM_DASHBOARD', label: 'Global Platform Overview', icon: <Layers className="w-4 h-4" /> },
        { id: 'SCREEN_16_TENANT_MANAGEMENT', label: 'Tenant Management', icon: <Building className="w-4 h-4" /> },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`platform-nav-${item.id.toLowerCase()}`}
            onClick={() => queueStore.setScreen(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isActive 
                ? 'bg-[#1E293B] text-[#00ACC1] border-l-4 border-[#00ACC1] shadow-sm' 
                : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-[#00ACC1]' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1]" />}
          </button>
        );
      });
    }

    return null;
  };

  return (
    <aside className="w-64 bg-[#0F172A] flex flex-col flex-shrink-0 justify-between text-white min-h-[calc(100vh-80px)] border-r border-slate-800 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ACC1] rounded-lg flex items-center justify-center font-bold text-white italic shadow-sm">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">ALIGN</h1>
            <span className="text-[10px] text-slate-400 font-mono">Operations Hub</span>
          </div>
        </div>

        {/* Branch Context Profile Banner */}
        <div className="mx-4 mb-4 p-3 bg-[#1E293B] rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00ACC1]/20 text-[#00ACC1] flex items-center justify-center font-bold text-xs border border-[#00ACC1]/30">
              {currentOrg.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-xs text-white truncate">{currentLocation.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{currentLocation.subtitle}</div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="px-4 py-2 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Navigation
          </div>
          {renderNavLinks()}
        </nav>
      </div>

      {/* System Status and Support Footer */}
      <div className="p-6 border-t border-slate-800 space-y-3">
        {/* System Status Pill */}
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-mono tracking-wider text-[11px]">SYSTEM ONLINE</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
          <button 
            onClick={() => alert('ALIGN Queue Management Platform Help & Documentation')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help Center</span>
          </button>
          <button 
            onClick={() => queueStore.setRole('CUSTOMER')}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Console</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
