import React, { useState, useEffect } from 'react';
import { queueStore, AppState } from './services/store';
import { apiClient } from './services/apiClient';
import { LoginScreen } from './components/auth/LoginScreen';
import { ToastProvider, setToastFunctions, useToast } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Navigation Components
import { TopBar } from './components/navigation/TopBar';
import { SideNav } from './components/navigation/SideNav';

// Customer Flow Screens
import { Screen01Splash } from './components/customer/Screen01Splash';
import { Screen02Discovery } from './components/customer/Screen02Discovery';
import { Screen03Services } from './components/customer/Screen03Services';
import { Screen04JoinConfirm } from './components/customer/Screen04JoinConfirm';
import { Screen05ActiveStatus } from './components/customer/Screen05ActiveStatus';
import { Screen07History } from './components/customer/Screen07History';

// Staff Operations Screens
import { Screen08Login } from './components/staff/Screen08Login';
import { Screen09Operations } from './components/staff/Screen09Operations';
import { Screen11Announcements } from './components/staff/Screen11Announcements';

// Org Admin Screens
import { Screen12OrgDashboard } from './components/admin/Screen12OrgDashboard';
import { Screen13LocationManagement } from './components/admin/Screen13LocationManagement';
import { Screen14ServiceQueueConfig } from './components/admin/Screen14ServiceQueueConfig';
import { Screen17Analytics } from './components/admin/Screen17Analytics';

// Platform Admin Screens
import { Screen15PlatformDashboard } from './components/platform/Screen15PlatformDashboard';
import { Screen16TenantManagement } from './components/platform/Screen16TenantManagement';

// Public Monitor Screen
import { Screen22PublicDisplay } from './components/public/Screen22PublicDisplay';

import { Icon } from './components/common/Icon';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

interface AccessDeniedProps {
  currentRole?: string;
  requiredRole: string;
  onReturn: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ currentRole, requiredRole, onReturn }) => (
  <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#f7f7f4] animate-in fade-in duration-300">
    <Card className="max-w-md w-full p-8 text-center shadow-lg border border-red-200">
      <div className="w-12 h-12 rounded-md bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
        <Icon icon="lucide:shield-alert" className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-normal font-display text-[#26251e] mb-2 tracking-tight">Access Restricted</h2>
      <p className="text-xs text-[#73726c] mb-6 leading-relaxed">
        Your authenticated account (<span className="font-mono font-medium text-[#26251e]">{currentRole || 'ANONYMOUS'}</span>) does not have authorization to access this console. Required role: <span className="font-mono font-bold text-[#f54e00]">{requiredRole}</span>.
      </p>
      <Button
        onClick={onReturn}
        variant="default"
        size="sm"
        className="w-full"
      >
        Return to Authorized Console
      </Button>
    </Card>
  </div>
);

// Toast initialization wrapper
function AppContent() {
  const toastApi = useToast();
  
  // Set imperative API for use outside React components
  useEffect(() => {
    setToastFunctions({
      success: toastApi.success,
      error: toastApi.error,
      warning: toastApi.warning,
      info: toastApi.info,
    });
  }, [toastApi]);

  return <AppInner />;
}

function AppInner() {
  const [appState, setAppState] = useState<AppState>(queueStore.getState()); (window as any).getAppState = () => appState;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = queueStore.subscribe((state) => {
      setAppState({ ...state });
    });

    const initAuth = async () => {
      if (apiClient.getRefreshToken()) {
        queueStore.setAuthStatus('AUTH_RESTORING');
        const refreshed = await apiClient.refresh();
        if (refreshed) {
          try {
            const res = await apiClient.authenticatedFetch('/api/v1/auth/me');
            if (res.ok) {
              const user = await res.json();
              queueStore.setAuthStatus('AUTH_READY');
              queueStore.setAuthStatus('AUTHENTICATED', user);
              if (user.role) {
                queueStore.setRole(user.role);
              }
              return;
            }
          } catch {
            // session restore failed
          }
        }
      }
      
      // If unauthenticated, place user on Customer Portal by default
      queueStore.setAuthStatus('UNAUTHENTICATED');
      const state = queueStore.getState();
      if (state.currentRole !== 'PUBLIC_DISPLAY') {
        if (state.currentRole !== 'CUSTOMER' || state.currentScreen === 'SCREEN_08_STAFF_LOGIN' || state.currentScreen.startsWith('SCREEN_09') || state.currentScreen.startsWith('SCREEN_1')) {
          queueStore.setRole('CUSTOMER');
          queueStore.setScreen(state.activeCustomerTokenId ? 'SCREEN_05_ACTIVE_STATUS' : 'SCREEN_02_DISCOVERY');
        }
      }
    };
    initAuth();

    return () => unsubscribe();
  }, []);

  const renderActiveScreen = () => {
    const authRole = appState.currentUser?.role;
    const isAuthenticated = appState.authStatus === 'AUTHENTICATED';

    // If unauthenticated visitor hits an admin/staff route without explicit login, show Customer Portal
    if (!isAuthenticated && appState.currentScreen !== 'SCREEN_08_STAFF_LOGIN' && appState.currentScreen !== 'SCREEN_22_PUBLIC_DISPLAY' && (appState.currentScreen.startsWith('SCREEN_09') || appState.currentScreen.startsWith('SCREEN_1'))) {
      return <Screen02Discovery appState={appState} />;
    }

    switch (appState.currentScreen) {
      // Customer Flow (Public)
      case 'SCREEN_01_SPLASH':
        return <Screen01Splash />;
      case 'SCREEN_02_DISCOVERY':
        return <Screen02Discovery appState={appState} />;
      case 'SCREEN_03_SERVICES':
        return <Screen03Services appState={appState} />;
      case 'SCREEN_04_JOIN_CONFIRM':
        return <Screen04JoinConfirm appState={appState} />;
      case 'SCREEN_05_ACTIVE_STATUS':
        return <Screen05ActiveStatus appState={appState} />;
      case 'SCREEN_07_HISTORY':
        return <Screen07History appState={appState} />;

      // Authentication Screen
      case 'SCREEN_08_STAFF_LOGIN':
        return <Screen08Login />;

      // Staff Operational Flow (STAFF or ORG_ADMIN)
      case 'SCREEN_09_STAFF_OPERATIONS':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'STAFF' && authRole !== 'ORG_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="STAFF or ORG_ADMIN" 
              onReturn={() => queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD')} 
            />
          );
        }
        return <Screen09Operations appState={appState} />;

      case 'SCREEN_11_ANNOUNCEMENT_CONTROL':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'STAFF' && authRole !== 'ORG_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="STAFF or ORG_ADMIN" 
              onReturn={() => queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD')} 
            />
          );
        }
        return <Screen11Announcements appState={appState} />;

      // Org Admin Flow (ORG_ADMIN only)
      case 'SCREEN_12_ORG_DASHBOARD':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'ORG_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="ORG_ADMIN" 
              onReturn={() => queueStore.setScreen(authRole === 'STAFF' ? 'SCREEN_09_STAFF_OPERATIONS' : 'SCREEN_15_PLATFORM_DASHBOARD')} 
            />
          );
        }
        return <Screen12OrgDashboard appState={appState} />;

      case 'SCREEN_13_LOCATION_MANAGEMENT':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'ORG_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="ORG_ADMIN" 
              onReturn={() => queueStore.setScreen(authRole === 'STAFF' ? 'SCREEN_09_STAFF_OPERATIONS' : 'SCREEN_15_PLATFORM_DASHBOARD')} 
            />
          );
        }
        return <Screen13LocationManagement appState={appState} />;

      case 'SCREEN_14_SERVICE_QUEUE_CONFIG':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'ORG_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="ORG_ADMIN" 
              onReturn={() => queueStore.setScreen(authRole === 'STAFF' ? 'SCREEN_09_STAFF_OPERATIONS' : 'SCREEN_15_PLATFORM_DASHBOARD')} 
            />
          );
        }
        return <Screen14ServiceQueueConfig appState={appState} />;

      // Analytics Flow (ORG_ADMIN or PLATFORM_ADMIN)
      case 'SCREEN_17_ANALYTICS':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'ORG_ADMIN' && authRole !== 'PLATFORM_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="ORG_ADMIN or PLATFORM_ADMIN" 
              onReturn={() => queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS')} 
            />
          );
        }
        return <Screen17Analytics appState={appState} />;

      // Platform Admin Flow (PLATFORM_ADMIN only)
      case 'SCREEN_15_PLATFORM_DASHBOARD':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'PLATFORM_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="PLATFORM_ADMIN" 
              onReturn={() => queueStore.setScreen(authRole === 'ORG_ADMIN' ? 'SCREEN_12_ORG_DASHBOARD' : 'SCREEN_09_STAFF_OPERATIONS')} 
            />
          );
        }
        return <Screen15PlatformDashboard appState={appState} />;

      case 'SCREEN_16_TENANT_MANAGEMENT':
        if (!isAuthenticated) return <Screen08Login />;
        if (authRole !== 'PLATFORM_ADMIN') {
          return (
            <AccessDenied 
              currentRole={authRole} 
              requiredRole="PLATFORM_ADMIN" 
              onReturn={() => queueStore.setScreen(authRole === 'ORG_ADMIN' ? 'SCREEN_12_ORG_DASHBOARD' : 'SCREEN_09_STAFF_OPERATIONS')} 
            />
          );
        }
        return <Screen16TenantManagement appState={appState} />;

      // Public Display Mode
      case 'SCREEN_22_PUBLIC_DISPLAY':
        if (appState.authStatus !== 'AUTHENTICATED') {
          return <LoginScreen />;
        }
        return <Screen22PublicDisplay appState={appState} />;

      default:
        return <Screen02Discovery appState={appState} />;
    }
  };

  const isPublicDisplay = appState.currentScreen === 'SCREEN_22_PUBLIC_DISPLAY';
  const isSplash = appState.currentScreen === 'SCREEN_01_SPLASH';
  const isCustomer = appState.currentRole === 'CUSTOMER' && appState.authStatus !== 'AUTHENTICATED';
  const isStaffLogin = appState.currentScreen === 'SCREEN_08_STAFF_LOGIN';

  // For Admin / Staff roles, render side navigation shell only when authenticated
  const showSideNav = !isPublicDisplay && !isSplash && !isCustomer && !isStaffLogin && appState.authStatus === 'AUTHENTICATED';

  return (
    <div className="min-h-screen flex flex-col bg-base text-content-primary font-sans antialiased">
      {/* Main Top Header (hidden in TV and Splash mode) */}
      {!isPublicDisplay && !isSplash && (
        <TopBar appState={appState} onMenuClick={() => setIsMobileNavOpen(true)} />
      )}

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* SideNav for Staff and Admin consoles */}
        {showSideNav && (
          <SideNav 
            appState={appState} 
            isOpen={isMobileNavOpen} 
            onClose={() => setIsMobileNavOpen(false)} 
          />
        )}

        {/* Dynamic Screen Viewport */}
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {renderActiveScreen()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// Root App with ToastProvider
export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
