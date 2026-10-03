import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  Bell, 
  HelpCircle, 
  Sparkles,
  ChevronDown,
  UserCheck,
  Shield,
  Tv,
  LogOut,
  Sliders,
  Radio
} from 'lucide-react';
import { queueStore } from '../../services/store';
import { AppState } from '../../services/store';
import { UserRole } from '../../types';

interface TopBarProps {
  appState: AppState;
}

export const TopBar: React.FC<TopBarProps> = ({ appState }) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  const handleBrandClick = () => {
    if (appState.currentRole === 'CUSTOMER') {
      queueStore.setScreen('SCREEN_02_DISCOVERY');
    } else if (appState.currentRole === 'STAFF') {
      queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
    } else if (appState.currentRole === 'ORG_ADMIN') {
      queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
    } else if (appState.currentRole === 'PLATFORM_ADMIN') {
      queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setShowRoleMenu(false);
    if (role === 'CUSTOMER') {
      queueStore.setRole('CUSTOMER');
      queueStore.setScreen('SCREEN_02_DISCOVERY');
    } else if (role === 'STAFF') {
      queueStore.setRole('STAFF');
      queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
    } else if (role === 'ORG_ADMIN') {
      queueStore.setRole('ORG_ADMIN');
      queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
    } else if (role === 'PLATFORM_ADMIN') {
      queueStore.setRole('PLATFORM_ADMIN');
      queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD');
    } else if (role === 'PUBLIC_DISPLAY') {
      queueStore.setRole('PUBLIC_DISPLAY');
      queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
    }
  };

  return (
    <div className="bg-base border-b border-border-subtle px-6 h-16 flex items-center justify-between flex-shrink-0 select-none relative z-40">
      {/* Brand & Context */}
      <div className="flex items-center gap-6">
        <div 
          onClick={handleBrandClick}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 border border-border-strong rounded flex items-center justify-center font-semibold text-content-primary italic group-hover:bg-surface-interactive transition-colors">
            A
          </div>
          <div>
            <div className="flex items-center gap-2 leading-none">
              <span className="font-semibold tracking-wide text-sm text-content-primary uppercase">ALIGN</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border-subtle text-content-secondary font-mono tracking-widest uppercase">QMS</span>
            </div>
            <span className="text-[10px] text-content-muted font-mono tracking-widest uppercase mt-1 block">Digital Queue</span>
          </div>
        </div>

        {/* Location / Tenant Selector Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-surface border border-border-subtle rounded text-xs">
          <Building2 className="w-3.5 h-3.5 text-content-muted" />
          <span className="font-medium text-content-primary">{currentOrg.name}</span>
          <span className="text-border-strong mx-1">|</span>
          <MapPin className="w-3.5 h-3.5 text-content-muted" />
          <span className="text-content-secondary">{currentLocation.name} <span className="text-content-muted ml-1">({currentLocation.subtitle})</span></span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            placeholder={
              appState.currentRole === 'CUSTOMER'
                ? "Search organizations, locations, or services..."
                : "Search queues, services, counters, or actions..."
            }
            className="w-full pl-9 pr-12 py-2 bg-surface border border-border-subtle rounded text-sm text-content-primary placeholder-content-muted focus:outline-none focus:border-border-strong focus:bg-surface-elevated transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-base border border-border-subtle text-content-muted rounded font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Real-time sync badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded bg-base border border-border-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
          <span className="font-mono text-[10px] font-medium tracking-widest text-success uppercase">LIVE</span>
        </div>

        {/* Public TV Display Quick Link */}
        <button
          onClick={() => {
            queueStore.setRole('PUBLIC_DISPLAY');
            queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
          }}
          className="hidden md:flex items-center gap-1.5 text-xs font-medium text-content-secondary hover:text-content-primary bg-surface hover:bg-surface-interactive px-3 py-1.5 rounded border border-border-subtle transition-colors cursor-pointer"
          title="Switch to Public TV Queue Display"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Display</span>
        </button>

        {/* Notifications */}
        <button 
          onClick={() => alert('All systems operational. Zero active incident alerts.')}
          className="relative p-2 text-content-secondary hover:text-content-primary hover:bg-surface-interactive rounded transition-colors cursor-pointer"
          title="System Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent border border-base"></span>
        </button>

        {/* User / Org Avatar with Menu */}
        <div className="relative">
          <button
            id="nav-customer-portal"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded border border-transparent hover:border-border-subtle hover:bg-surface transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded bg-surface border border-border-strong text-content-primary flex items-center justify-center font-mono text-xs">
              {appState.currentRole === 'CUSTOMER' ? 'CU' : 'AM'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium leading-tight text-content-primary">
                {appState.currentRole === 'CUSTOMER' ? 'Customer Portal' : appState.currentStaffUser?.name || 'Alex Mercer'}
              </div>
              <div className="text-[10px] text-content-muted font-mono tracking-widest uppercase mt-0.5">
                {appState.currentRole.toLowerCase().replace('_', ' ')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-content-muted hidden sm:block ml-1" />
          </button>

          {/* Account & Portal Menu Dropdown */}
          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-elevated border border-border-strong rounded shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-border-subtle mb-1">
                <div className="text-xs font-medium text-content-primary">
                  {appState.currentRole === 'CUSTOMER' ? 'Customer Session' : 'Staff Session'}
                </div>
                <div className="text-[10px] text-content-muted font-mono tracking-widest uppercase mt-1">
                  {currentOrg.name}
                </div>
              </div>

              {appState.currentRole === 'CUSTOMER' ? (
                <>
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      queueStore.setRole('STAFF');
                      queueStore.setScreen('SCREEN_08_STAFF_LOGIN');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-content-secondary hover:bg-surface-interactive hover:text-content-primary rounded transition-colors cursor-pointer text-left"
                  >
                    <UserCheck className="w-4 h-4 text-content-muted" />
                    <span>Staff Portal Sign In</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      queueStore.setScreen('SCREEN_07_HISTORY');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-content-secondary hover:bg-surface-interactive hover:text-content-primary rounded transition-colors cursor-pointer text-left"
                  >
                    <MapPin className="w-4 h-4 text-content-muted" />
                    <span>My Tokens &amp; History</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRoleSelect('STAFF')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors cursor-pointer text-left ${
                      appState.currentRole === 'STAFF' ? 'bg-surface-interactive text-content-primary' : 'text-content-secondary hover:bg-surface-interactive hover:text-content-primary'
                    }`}
                  >
                    <UserCheck className={`w-4 h-4 ${appState.currentRole === 'STAFF' ? 'text-accent' : 'text-content-muted'}`} />
                    <span>Staff Console</span>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('ORG_ADMIN')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors cursor-pointer text-left ${
                      appState.currentRole === 'ORG_ADMIN' ? 'bg-surface-interactive text-content-primary' : 'text-content-secondary hover:bg-surface-interactive hover:text-content-primary'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${appState.currentRole === 'ORG_ADMIN' ? 'text-accent' : 'text-content-muted'}`} />
                    <span>Org Admin Console</span>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('PLATFORM_ADMIN')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors cursor-pointer text-left ${
                      appState.currentRole === 'PLATFORM_ADMIN' ? 'bg-surface-interactive text-content-primary' : 'text-content-secondary hover:bg-surface-interactive hover:text-content-primary'
                    }`}
                  >
                    <Shield className={`w-4 h-4 ${appState.currentRole === 'PLATFORM_ADMIN' ? 'text-accent' : 'text-content-muted'}`} />
                    <span>Platform Admin</span>
                  </button>
                  <div className="my-1 border-t border-border-subtle"></div>
                  <button
                    onClick={() => handleRoleSelect('CUSTOMER')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-surface-interactive rounded transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out to Customer Portal</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
