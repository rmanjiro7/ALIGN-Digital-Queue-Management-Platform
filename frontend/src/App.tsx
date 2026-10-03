import React, { useState, useEffect } from 'react';
import { queueStore, AppState } from './services/store';
import { apiClient } from './services/apiClient';
import { LoginScreen } from './components/auth/LoginScreen';

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

export default function App() {
  const [appState, setAppState] = useState<AppState>(queueStore.getState()); (window as any).getAppState = () => appState;

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
            } else {
              queueStore.setAuthStatus('UNAUTHENTICATED');
            }
          } catch {
            queueStore.setAuthStatus('UNAUTHENTICATED');
          }
        } else {
          queueStore.setAuthStatus('UNAUTHENTICATED');
        }
      } else {
        queueStore.setAuthStatus('UNAUTHENTICATED');
      }
    };
    initAuth();

    return () => unsubscribe();
  }, []);

  const renderActiveScreen = () => {
    switch (appState.currentScreen) {
      // Customer Flow
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

      // Staff Flow
      case 'SCREEN_08_STAFF_LOGIN':
        return <Screen08Login />;
      case 'SCREEN_09_STAFF_OPERATIONS':
        return <Screen09Operations appState={appState} />;
      case 'SCREEN_11_ANNOUNCEMENT_CONTROL':
        return <Screen11Announcements appState={appState} />;

      // Org Admin Flow
      case 'SCREEN_12_ORG_DASHBOARD':
        return <Screen12OrgDashboard appState={appState} />;
      case 'SCREEN_13_LOCATION_MANAGEMENT':
        return <Screen13LocationManagement appState={appState} />;
      case 'SCREEN_14_SERVICE_QUEUE_CONFIG':
        return <Screen14ServiceQueueConfig appState={appState} />;
      case 'SCREEN_17_ANALYTICS':
        return <Screen17Analytics appState={appState} />;

      // Platform Admin Flow
      case 'SCREEN_15_PLATFORM_DASHBOARD':
        return <Screen15PlatformDashboard appState={appState} />;
      case 'SCREEN_16_TENANT_MANAGEMENT':
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
  const isCustomer = appState.currentRole === 'CUSTOMER';
  const isStaffLogin = appState.currentScreen === 'SCREEN_08_STAFF_LOGIN';

  // For Admin / Staff roles, render side navigation shell
  const showSideNav = !isPublicDisplay && !isSplash && !isCustomer && !isStaffLogin;

  return (
    <div className="min-h-screen flex flex-col bg-base text-content-primary font-sans antialiased">
      {/* Main Top Header (hidden in TV and Splash mode) */}
      {!isPublicDisplay && !isSplash && (
        <TopBar appState={appState} />
      )}

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* SideNav for Staff and Admin consoles */}
        {showSideNav && (
          <SideNav appState={appState} />
        )}

        {/* Dynamic Screen Viewport */}
        <main className="flex-1 overflow-y-auto">
          {renderActiveScreen()}
        </main>
      </div>
    </div>
  );
}
