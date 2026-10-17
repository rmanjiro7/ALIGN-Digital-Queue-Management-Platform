import React from 'react';
import { queueStore, AppState } from '../../services/store';
import { apiClient } from '../../services/apiClient';
import { ScreenId } from '../../types';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';

interface SideNavProps {
  appState: AppState;
  isOpen?: boolean;
  onClose?: () => void;
}

export const SideNav: React.FC<SideNavProps> = ({ appState, isOpen = true, onClose }) => {
  const { info } = useToast();
  const currentRole = appState.currentUser?.role || appState.currentRole;
  const currentScreen = appState.currentScreen;
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  const handleNavClick = (screenId: ScreenId) => {
    queueStore.setScreen(screenId);
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    apiClient.clearSession();
    queueStore.setAuthStatus('UNAUTHENTICATED', null);
    queueStore.setRole('CUSTOMER');
    queueStore.setScreen('SCREEN_02_DISCOVERY');
    if (onClose) {
      onClose();
    }
  };

  // Role specific menu items
  const renderNavLinks = () => {
    if (currentRole === 'STAFF') {
      const items: { id: ScreenId; label: string; icon: string; badge?: string }[] = [
        { id: 'SCREEN_09_STAFF_OPERATIONS', label: 'Live Queue Operations', icon: 'lucide:layout-list', badge: 'Active' },
        { id: 'SCREEN_11_ANNOUNCEMENT_CONTROL', label: 'Announcement Control', icon: 'lucide:radio' },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`staff-nav-${item.id.toLowerCase()}`}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer border ${
              isActive 
                ? 'bg-[#fafaf7] text-[#26251e] border-[#e6e5e0]' 
                : 'text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7] border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon icon={item.icon} className={`w-4 h-4 ${isActive ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold tracking-wider uppercase ${
                isActive ? 'bg-[#f54e00]/10 text-[#f54e00]' : 'bg-[#1f8a65]/10 text-[#1f8a65]'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      });
    }

    if (currentRole === 'ORG_ADMIN') {
      const items: { id: ScreenId; label: string; icon: string }[] = [
        { id: 'SCREEN_12_ORG_DASHBOARD', label: 'Overview Dashboard', icon: 'lucide:layout-dashboard' },
        { id: 'SCREEN_13_LOCATION_MANAGEMENT', label: 'Locations & Branches', icon: 'lucide:map-pin' },
        { id: 'SCREEN_14_SERVICE_QUEUE_CONFIG', label: 'Service & Queue Settings', icon: 'lucide:sliders' },
        { id: 'SCREEN_17_ANALYTICS', label: 'Analytics & Reporting', icon: 'lucide:chart-bar' },
        { id: 'SCREEN_09_STAFF_OPERATIONS', label: 'Switch to Live Queue', icon: 'lucide:layout-list' },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`org-nav-${item.id.toLowerCase()}`}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer border ${
              isActive 
                ? 'bg-[#fafaf7] text-[#26251e] border-[#e6e5e0]' 
                : 'text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7] border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon icon={item.icon} className={`w-4 h-4 ${isActive ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
              <span>{item.label}</span>
            </div>
            {isActive && <Icon icon="lucide:chevron-right" className="w-3.5 h-3.5 text-[#807d72]" />}
          </button>
        );
      });
    }

    if (currentRole === 'PLATFORM_ADMIN') {
      const items: { id: ScreenId; label: string; icon: string }[] = [
        { id: 'SCREEN_15_PLATFORM_DASHBOARD', label: 'Global Platform Overview', icon: 'lucide:layers' },
        { id: 'SCREEN_16_TENANT_MANAGEMENT', label: 'Tenant Management', icon: 'lucide:building-2' },
        { id: 'SCREEN_17_ANALYTICS', label: 'Analytics & Reporting', icon: 'lucide:chart-bar' },
      ];

      return items.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            id={`platform-nav-${item.id.toLowerCase()}`}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer border ${
              isActive 
                ? 'bg-[#fafaf7] text-[#26251e] border-[#e6e5e0]' 
                : 'text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7] border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon icon={item.icon} className={`w-4 h-4 ${isActive ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
              <span>{item.label}</span>
            </div>
            {isActive && <Icon icon="lucide:chevron-right" className="w-3.5 h-3.5 text-[#807d72]" />}
          </button>
        );
      });
    }

    return null;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#26251e]/20 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - Desktop: always visible, Mobile: drawer */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white flex flex-col flex-shrink-0 justify-between text-[#26251e] 
        min-h-[calc(100vh-64px)] border-r border-[#e6e5e0] select-none
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden p-2 text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7] rounded-md transition-colors"
          aria-label="Close menu"
        >
          <Icon icon="lucide:x" className="w-5 h-5" />
        </button>

        <div>
          {/* Brand Header */}
          <div className="px-6 py-6 flex items-center gap-3 border-b border-[#efeee8] mb-4">
            <div className="w-7 h-7 rounded-md bg-[#26251e] text-[#f7f7f4] flex items-center justify-center font-semibold text-xs tracking-wider">
              A
            </div>
            <div>
              <span className="text-sm font-normal tracking-[-0.02em] text-[#26251e] leading-none block uppercase">ALIGN</span>
              <span className="text-[10px] text-[#807d72] font-mono tracking-widest uppercase mt-1 block">Management Console</span>
            </div>
          </div>

          {/* Branch Context Profile Banner */}
          <div className="mx-4 mb-6 px-3.5 py-3 bg-[#fafaf7] border border-[#e6e5e0] rounded-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded border border-[#cfcdc4] bg-white text-[#26251e] flex items-center justify-center font-mono text-xs font-semibold">
                {currentOrg?.name?.substring(0, 2).toUpperCase() || 'AL'}
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-xs text-[#26251e] truncate">{currentLocation?.name}</div>
                <div className="text-[10px] text-[#807d72] truncate">{currentLocation?.subtitle}</div>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="px-3">
            <div className="text-[10px] font-mono font-medium text-[#807d72] uppercase tracking-widest px-2 mb-3">
              Workspace Navigation
            </div>
            {renderNavLinks()}
          </nav>
        </div>

        {/* System Status and Support Footer */}
        <div className="p-4 border-t border-[#efeee8]">
          {/* System Status Pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#fafaf7] border border-[#e6e5e0] rounded-md mb-3">
            <div className="w-1.5 h-1.5 bg-[#1f8a65] rounded-full animate-pulse" />
            <span className="font-mono tracking-wider text-[10px] text-[#5a5852] uppercase font-semibold">System Operational</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between text-xs text-[#807d72] px-1">
            <button 
              onClick={() => info('ALIGN Queue Management Platform Help & Documentation', 'Help')}
              className="flex items-center gap-1.5 hover:text-[#26251e] transition-colors cursor-pointer"
            >
              <Icon icon="lucide:help-circle" className="w-3.5 h-3.5" />
              <span>Documentation</span>
            </button>
            <button 
              id="nav-logout"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[#cf2d56] hover:text-[#cf2d56] transition-colors cursor-pointer font-medium"
            >
              <Icon icon="lucide:log-out" className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
