import React from 'react';
import { AppState, queueStore } from '../../services/store';
import { PixelGridLoader } from './PixelGridLoader';
import { Icon } from './Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface AuthGuardProps {
  appState: AppState;
  children: React.ReactNode;
}

/**
 * AuthGuard - Prevents rendering of admin/authenticated screens during auth restoration
 * 
 * This component handles the authentication display states without violating React's Rules of Hooks.
 * It shows the signature Anime.js 3x3 pixel grid pulse during AUTH_RESTORING/AUTHENTICATING and an editorial error UI if UNAUTHENTICATED.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ appState, children }) => {
  // Show pixel grid loader during authentication restoration
  if (appState.authStatus === 'AUTH_RESTORING' || appState.authStatus === 'AUTHENTICATING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] bg-[#f7f7f4]">
        <div className="text-center space-y-4">
          <PixelGridLoader />
          <p className="text-xs font-mono text-[#73726c] tracking-wider uppercase">Authenticating Session...</p>
        </div>
      </div>
    );
  }

  // Show error only if explicitly unauthenticated after restoration attempt
  if (appState.authStatus === 'UNAUTHENTICATED') {
    return (
      <div className="flex items-center justify-center min-h-[85vh] bg-[#f7f7f4] p-4">
        <Card className="max-w-md w-full p-8 text-center shadow-lg">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-md flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Icon icon="lucide:shield-alert" className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-normal font-display text-[#26251e] mb-2 tracking-tight">Not Authenticated</h2>
          <p className="text-xs text-[#73726c] mb-6">Please log in to access this administration console.</p>
          <Button
            onClick={() => queueStore.setScreen('SCREEN_08_STAFF_LOGIN')}
            variant="default"
            size="sm"
            className="w-full"
          >
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
};
