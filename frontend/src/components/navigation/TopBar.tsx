import React, { useState } from 'react';
import { queueStore } from '../../services/store';
import { AppState } from '../../services/store';
import { UserRole } from '../../types';
import { useToast } from '../common/Toast';
import { apiClient } from '../../services/apiClient';
import { Icon } from '../common/Icon';

interface TopBarProps {
  appState: AppState;
  onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ appState, onMenuClick }) => {
  const { info } = useToast();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];
  
  const authRole = appState.currentUser?.role;
  const isAuthenticated = appState.authStatus === 'AUTHENTICATED';
  const isStaffOrAdmin = isAuthenticated && (
    authRole === 'STAFF' || 
    authRole === 'ORG_ADMIN' || 
    authRole === 'PLATFORM_ADMIN'
  );
  const isStaffLogin = appState.currentScreen === 'SCREEN_08_STAFF_LOGIN';

  const handleBrandClick = () => {
    if (!isAuthenticated || !authRole) {
      queueStore.setScreen('SCREEN_02_DISCOVERY');
      return;
    }
    if (authRole === 'STAFF') {
      queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
    } else if (authRole === 'ORG_ADMIN') {
      queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
    } else if (authRole === 'PLATFORM_ADMIN') {
      queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD');
    } else {
      queueStore.setScreen('SCREEN_02_DISCOVERY');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setShowRoleMenu(false);
    if (role === 'CUSTOMER') {
      apiClient.clearSession();
      queueStore.setAuthStatus('UNAUTHENTICATED', null);
      queueStore.setRole('CUSTOMER');
      queueStore.setScreen('SCREEN_02_DISCOVERY');
      return;
    }

    if (role === 'PUBLIC_DISPLAY') {
      queueStore.setRole('PUBLIC_DISPLAY');
      queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
      return;
    }

    // Allow switching only if authenticated and permitted by role
    if (isAuthenticated && authRole) {
      if (authRole === role) {
        queueStore.setRole(role);
        return;
      }
      // ORG_ADMIN has operational authority to view/operate staff queue
      if (authRole === 'ORG_ADMIN' && role === 'STAFF') {
        queueStore.setRole('STAFF');
        return;
      }
    }

    // Attempting to switch to an unauthorized role requires explicit new login
    apiClient.clearSession();
    queueStore.setAuthStatus('UNAUTHENTICATED', null);
    queueStore.setRole(role);
    queueStore.setScreen('SCREEN_08_STAFF_LOGIN');
  };

  return (
    <header className="bg-[#f7f7f4] border-b border-[#e6e5e0] px-6 h-16 flex items-center justify-between flex-shrink-0 select-none relative z-40">
      {/* Brand & Context */}
      <div className="flex items-center gap-6">
        {/* Mobile Menu Button - Only shown for staff/admin roles */}
        {isStaffOrAdmin && !isStaffLogin && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7] rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Icon icon="lucide:menu" className="w-5 h-5" />
          </button>
        )}

        <div 
          onClick={handleBrandClick}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-md bg-[#26251e] text-[#f7f7f4] flex items-center justify-center font-semibold text-xs tracking-wider transition-opacity group-hover:opacity-90">
            A
          </div>
          <div>
            <div className="flex items-center gap-2 leading-none">
              <span className="font-normal text-base tracking-[-0.02em] text-[#26251e] uppercase">ALIGN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f54e00]" />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e6e5e0] text-[#26251e] font-mono tracking-wider uppercase">QMS</span>
            </div>
            <span className="text-[10px] text-[#807d72] font-mono tracking-widest uppercase mt-0.5 block">Digital Queue</span>
          </div>
        </div>

        {/* Location / Tenant Selector Pill */}
        {!isStaffLogin && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e6e5e0] rounded-md text-xs">
            <Icon icon="lucide:building-2" className="w-3.5 h-3.5 text-[#807d72]" />
            <span className="font-medium text-[#26251e]">{currentOrg?.name}</span>
            <span className="text-[#cfcdc4] mx-1">/</span>
            <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 text-[#807d72]" />
            <span className="text-[#5a5852]">{currentLocation?.name} <span className="text-[#807d72] ml-1">({currentLocation?.subtitle})</span></span>
          </div>
        )}
      </div>

      {/* Center Search Bar */}
      {!isStaffLogin && (
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full group">
            <Icon icon="lucide:search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72] group-focus-within:text-[#26251e] transition-colors" />
            <input 
              type="text" 
              placeholder={
                appState.currentRole === 'CUSTOMER'
                  ? "Search organizations, locations, or services..."
                  : "Search queues, services, counters, or actions..."
              }
              className="w-full pl-9 pr-12 py-2 bg-white border border-[#e6e5e0] rounded-md text-sm text-[#26251e] placeholder:text-[#a09c92] focus:outline-none focus:border-[#26251e] transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-[#fafaf7] border border-[#e6e5e0] text-[#807d72] rounded font-mono">⌘K</kbd>
          </div>
        </div>
      )}

      {/* Right Controls */}
      {!isStaffLogin && (
        <div className="flex items-center gap-3">
          {/* Real-time sync badge */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-[#e6e5e0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1f8a65] animate-pulse" />
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#1f8a65] uppercase">LIVE</span>
          </div>

          {/* Public TV Display Quick Link */}
          <button
            onClick={() => {
              queueStore.setRole('PUBLIC_DISPLAY');
              queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
            }}
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-[#5a5852] hover:text-[#26251e] bg-white hover:bg-[#fafaf7] px-3 py-1.5 rounded-md border border-[#e6e5e0] transition-colors cursor-pointer"
            title="Switch to Public TV Queue Display"
          >
            <Icon icon="lucide:tv" className="w-3.5 h-3.5 text-[#5a5852]" />
            <span>Display</span>
          </button>

          {/* Notifications */}
          <button 
            onClick={() => info('All systems operational. Zero active incident alerts.', 'System Status')}
            className="relative p-2 text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7] rounded-md transition-colors cursor-pointer"
            title="System Notifications"
          >
            <Icon icon="lucide:bell" className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f54e00]" />
          </button>

          {/* User / Org Avatar with Menu */}
          <div className="relative">
            <button
              id="nav-customer-portal"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border border-[#e6e5e0] bg-white hover:bg-[#fafaf7] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded bg-[#fafaf7] border border-[#e6e5e0] text-[#26251e] flex items-center justify-center font-mono text-[11px] font-medium">
                {!isAuthenticated ? 'CU' : authRole === 'STAFF' ? 'ST' : authRole === 'ORG_ADMIN' ? 'OA' : 'PA'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium leading-tight text-[#26251e]">
                  {!isAuthenticated
                    ? 'Customer Portal'
                    : authRole === 'STAFF'
                    ? 'Staff Portal'
                    : authRole === 'ORG_ADMIN'
                    ? 'Org Admin Portal'
                    : authRole === 'PLATFORM_ADMIN'
                    ? 'Platform Admin'
                    : 'System Portal'}
                </div>
                <div className="text-[10px] text-[#807d72] font-mono tracking-widest uppercase mt-0.5">
                  {!isAuthenticated ? 'customer' : (authRole || 'user').toLowerCase().replace('_', ' ')}
                </div>
              </div>
              <Icon icon="lucide:chevron-down" className="w-3.5 h-3.5 text-[#807d72] hidden sm:block ml-1" />
            </button>

            {/* Account & Portal Menu Dropdown */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-[#e6e5e0] rounded-lg shadow-none p-2 z-50 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[#efeee8] mb-1">
                  <div className="text-xs font-medium text-[#26251e] truncate">
                    {appState.currentUser?.name || (!isAuthenticated ? 'Customer Session' : 'Staff Session')}
                  </div>
                  <div className="text-[10px] text-[#807d72] font-mono tracking-widest uppercase mt-0.5 truncate">
                    {appState.currentUser?.email || (currentOrg?.name || 'ALIGN QMS')}
                  </div>
                </div>

                {!isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        queueStore.setRole('STAFF');
                        queueStore.setScreen('SCREEN_08_STAFF_LOGIN');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#5a5852] hover:bg-[#fafaf7] hover:text-[#26251e] rounded-md transition-colors cursor-pointer text-left"
                    >
                      <Icon icon="lucide:user-check" className="w-4 h-4 text-[#807d72]" />
                      <span>Staff Portal Sign In</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        queueStore.setScreen('SCREEN_07_HISTORY');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#5a5852] hover:bg-[#fafaf7] hover:text-[#26251e] rounded-md transition-colors cursor-pointer text-left"
                    >
                      <Icon icon="lucide:map-pin" className="w-4 h-4 text-[#807d72]" />
                      <span>My Tokens &amp; History</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* STAFF or ORG_ADMIN can access Staff Console */}
                    {(authRole === 'STAFF' || authRole === 'ORG_ADMIN') && (
                      <button
                        onClick={() => handleRoleSelect('STAFF')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-left ${
                          appState.currentRole === 'STAFF' ? 'bg-[#fafaf7] text-[#26251e] font-medium' : 'text-[#5a5852] hover:bg-[#fafaf7] hover:text-[#26251e]'
                        }`}
                      >
                        <Icon icon="lucide:user-check" className={`w-4 h-4 ${appState.currentRole === 'STAFF' ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
                        <span>Staff Console</span>
                      </button>
                    )}

                    {/* Only ORG_ADMIN can access Org Admin Console */}
                    {authRole === 'ORG_ADMIN' && (
                      <button
                        onClick={() => handleRoleSelect('ORG_ADMIN')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-left ${
                          appState.currentRole === 'ORG_ADMIN' ? 'bg-[#fafaf7] text-[#26251e] font-medium' : 'text-[#5a5852] hover:bg-[#fafaf7] hover:text-[#26251e]'
                        }`}
                      >
                        <Icon icon="lucide:building-2" className={`w-4 h-4 ${appState.currentRole === 'ORG_ADMIN' ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
                        <span>Org Admin Console</span>
                      </button>
                    )}

                    {/* Only PLATFORM_ADMIN can access Platform Admin */}
                    {authRole === 'PLATFORM_ADMIN' && (
                      <button
                        onClick={() => handleRoleSelect('PLATFORM_ADMIN')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-left ${
                          appState.currentRole === 'PLATFORM_ADMIN' ? 'bg-[#fafaf7] text-[#26251e] font-medium' : 'text-[#5a5852] hover:bg-[#fafaf7] hover:text-[#26251e]'
                        }`}
                      >
                        <Icon icon="lucide:shield" className={`w-4 h-4 ${appState.currentRole === 'PLATFORM_ADMIN' ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
                        <span>Platform Admin</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-[#efeee8]" />
                    <button
                      id="nav-logout"
                      onClick={() => handleRoleSelect('CUSTOMER')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#cf2d56] hover:bg-[#cf2d56]/5 rounded-md transition-colors cursor-pointer text-left"
                    >
                      <Icon icon="lucide:log-out" className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
