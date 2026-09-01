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
    <div className="bg-[#0F172A] text-white border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0 select-none relative z-40">
      {/* Brand & Context */}
      <div className="flex items-center gap-4">
        <div 
          onClick={handleBrandClick}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00ACC1] flex items-center justify-center font-black text-white text-base shadow-inner group-hover:scale-105 transition-transform">
            A
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold tracking-wider text-sm text-white">ALIGN</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00ACC1]/20 text-[#00ACC1] font-mono font-bold">QMS</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Digital Queue Management</span>
          </div>
        </div>

        {/* Location / Tenant Selector Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-[#1E293B] rounded-full border border-slate-700 text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#00ACC1]" />
          <span className="font-semibold text-slate-200">{currentOrg.name}</span>
          <span className="text-slate-600">•</span>
          <MapPin className="w-3.5 h-3.5 text-[#00ACC1]" />
          <span className="text-slate-300">{currentLocation.name} ({currentLocation.subtitle})</span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={
              appState.currentRole === 'CUSTOMER'
                ? "Search organizations, locations, or services..."
                : "Search queues, services, counters, or actions..."
            }
            className="w-full pl-9 pr-4 py-1.5 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00ACC1] focus:ring-1 focus:ring-[#00ACC1] font-sans"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Real-time sync badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 px-3 py-1 rounded-full bg-[#1E293B] border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-[11px] font-bold text-emerald-400">LIVE SYNC</span>
        </div>

        {/* Public TV Display Quick Link */}
        <button
          onClick={() => {
            queueStore.setRole('PUBLIC_DISPLAY');
            queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
          }}
          className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1E293B] hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="Switch to Public TV Queue Display"
        >
          <Tv className="w-3.5 h-3.5 text-[#00ACC1]" />
          <span>Public TV</span>
        </button>

        {/* Notifications */}
        <button 
          onClick={() => alert('All systems operational. Zero active incident alerts.')}
          className="relative p-2 text-slate-300 hover:text-white hover:bg-[#1E293B] rounded-xl transition-colors cursor-pointer"
          title="System Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00ACC1]"></span>
        </button>

        {/* User / Org Avatar with Menu */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-xl hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#1E293B] border-2 border-[#00ACC1] text-[#00ACC1] flex items-center justify-center font-bold text-xs">
              {appState.currentRole === 'CUSTOMER' ? 'CU' : 'AM'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold leading-tight text-slate-200">
                {appState.currentRole === 'CUSTOMER' ? 'Customer Portal' : appState.currentStaffUser?.name || 'Alex Mercer'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono capitalize">
                {appState.currentRole.toLowerCase().replace('_', ' ')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Account & Portal Menu Dropdown */}
          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-xl p-2 z-50 text-xs font-sans">
              <div className="px-3 py-2 border-b border-slate-700/80 mb-1">
                <div className="font-bold text-white">
                  {appState.currentRole === 'CUSTOMER' ? 'Customer Session' : 'Staff Session'}
                </div>
                <div className="text-[11px] text-slate-400">
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-[#0F172A] hover:text-[#00ACC1] rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <UserCheck className="w-4 h-4 text-[#00ACC1]" />
                    <span>Staff Portal Sign In</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      queueStore.setScreen('SCREEN_07_HISTORY');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:bg-[#0F172A] hover:text-[#00ACC1] rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>My Tokens &amp; History</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRoleSelect('STAFF')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                      appState.currentRole === 'STAFF' ? 'bg-[#0F172A] text-[#00ACC1] font-bold' : 'text-slate-200 hover:bg-[#0F172A]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-[#00ACC1]" />
                    <span>Staff Console</span>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('ORG_ADMIN')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                      appState.currentRole === 'ORG_ADMIN' ? 'bg-[#0F172A] text-[#00ACC1] font-bold' : 'text-slate-200 hover:bg-[#0F172A]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#00ACC1]" />
                    <span>Org Admin Console</span>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('PLATFORM_ADMIN')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                      appState.currentRole === 'PLATFORM_ADMIN' ? 'bg-[#0F172A] text-[#00ACC1] font-bold' : 'text-slate-200 hover:bg-[#0F172A]'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-[#00ACC1]" />
                    <span>Platform Admin</span>
                  </button>
                  <div className="my-1 border-t border-slate-700/80"></div>
                  <button
                    onClick={() => handleRoleSelect('CUSTOMER')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-[#0F172A] hover:text-rose-300 rounded-xl transition-colors cursor-pointer text-left"
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
