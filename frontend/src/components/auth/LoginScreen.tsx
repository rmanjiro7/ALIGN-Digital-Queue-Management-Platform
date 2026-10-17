import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { queueStore } from '../../services/store';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await apiClient.login(email, password);
      
      // Update store with authentication success
      queueStore.setAuthStatus('AUTHENTICATED', response.user);
      
      // Route based on role
      const role = response.user.role;
      queueStore.setRole(role as any);
      
      if (role === 'DISPLAY') {
        queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
      } else if (role === 'STAFF') {
        queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
      } else if (role === 'ORG_ADMIN') {
        queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
      } else if (role === 'PLATFORM_ADMIN') {
        queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD');
      }
      
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Invalid credentials or account disabled');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f4] p-4 font-sans select-none relative">
      <Card className="w-full max-w-md p-8 shadow-xl relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 border border-[#e6e5e0] bg-[#fafaf7] rounded-md flex items-center justify-center font-bold text-[#f54e00] text-2xl mb-3">
            A
          </div>
          <h1 className="text-2xl font-normal font-display text-[#26251e] tracking-tight">ALIGN</h1>
          <p className="text-[#73726c] font-mono text-xs mt-1 uppercase tracking-wider">Display &amp; Staff Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {status === 'error' && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-mono text-center">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Icon icon="lucide:mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c8b85]" />
                <Input
                  type="email"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                  required
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Icon icon="lucide:lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c8b85]" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs"
                  required
                  disabled={status === 'loading'}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={status === 'loading'}
            variant="default"
            size="lg"
            className="w-full flex items-center justify-center gap-2 mt-2"
          >
            {status === 'loading' ? (
              <span className="font-mono text-xs">Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <Icon icon="lucide:arrow-right" className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e6e5e0] flex flex-col items-center justify-center gap-2 text-xs text-[#8c8b85] font-mono">
          <button
            type="button"
            onClick={() => queueStore.setScreen('SCREEN_08_STAFF_LOGIN')}
            className="text-[#f54e00] hover:underline font-semibold cursor-pointer"
          >
            Need a Staff / Admin account? Create one here →
          </button>
          <div className="flex items-center gap-1.5 mt-1">
            <Icon icon="lucide:building-2" className="w-3.5 h-3.5" />
            <span>ALIGN Queue Management Platform</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
