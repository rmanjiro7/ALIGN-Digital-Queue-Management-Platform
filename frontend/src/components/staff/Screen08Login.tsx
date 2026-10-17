import React, { useState } from 'react';
import { queueStore } from '../../services/store';
import { UserRole } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface AccountPreset {
  role: UserRole;
  label: string;
  badge: string;
  email: string;
  password: string;
  description: string;
  icon: string;
}

const PRESET_ACCOUNTS: AccountPreset[] = [
  {
    role: 'STAFF',
    label: 'Staff Operator',
    badge: 'Counter Ops',
    email: 'staff@align.local',
    password: 'Staff@1234',
    description: 'Counter operation & ticket serving console',
    icon: 'lucide:user-check'
  },
  {
    role: 'ORG_ADMIN',
    label: 'Org Admin',
    badge: 'Tenant Admin',
    email: 'admin@align.local',
    password: 'Admin@1234',
    description: 'Branch, counter, service & queue management',
    icon: 'lucide:building-2'
  },
  {
    role: 'PLATFORM_ADMIN',
    label: 'Platform Admin',
    badge: 'Global Admin',
    email: 'platform@align.local',
    password: 'Platform@1234',
    description: 'Cross-tenant oversight & platform onboarding',
    icon: 'lucide:shield-check'
  }
];

export const Screen08Login: React.FC = () => {
  const { error: toastError, info } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole>('STAFF');
  const [email, setEmail] = useState('staff@align.local');
  const [password, setPassword] = useState('Staff@1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const activePreset = PRESET_ACCOUNTS.find(a => a.role === selectedRole) || PRESET_ACCOUNTS[0];

  const handleSelectPreset = (preset: AccountPreset) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
    setPassword(preset.password);
  };

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(loginEmail, loginPass);
      queueStore.setAuthStatus('AUTHENTICATED', response.user);
      queueStore.setRole(response.user.role as UserRole);

      if (response.user.role === 'ORG_ADMIN') {
        queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
      } else if (response.user.role === 'PLATFORM_ADMIN') {
        queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD');
      } else {
        queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
      }
    } catch (err: any) {
      toastError(err.message || 'Login failed', 'Authentication Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    const preset = PRESET_ACCOUNTS.find(a => a.role === role);
    if (preset) {
      handleSelectPreset(preset);
      await performLogin(preset.email, preset.password);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header / Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-10 h-10 rounded-md bg-[#26251e] text-[#f7f7f4] flex items-center justify-center mb-4">
            <span className="font-semibold text-lg">A</span>
          </div>
          <h1 className="text-display-md text-[#26251e] mb-1">
            ALIGN System Access
          </h1>
          <p className="text-sm text-[#5a5852] max-w-sm">
            Select your assigned console role or authenticate with configured credentials.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-white border border-[#e6e5e0] p-1.5 rounded-lg mb-4 grid grid-cols-3 gap-1.5">
          {PRESET_ACCOUNTS.map((preset) => {
            const isSelected = selectedRole === preset.role && email === preset.email;
            return (
              <button
                key={preset.role}
                id={`preset-role-${preset.role.toLowerCase()}`}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex flex-col items-center py-2.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#fafaf7] border-[#e6e5e0] text-[#26251e] font-semibold'
                    : 'border-transparent text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon icon={preset.icon} className={`w-3.5 h-3.5 ${isSelected ? 'text-[#f54e00]' : 'text-[#807d72]'}`} />
                  <span>{preset.label.split(' ')[0]}</span>
                </div>
                <span className="text-[10px] text-[#807d72] font-mono">{preset.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Login Form */}
        <Card className="p-8 md:p-10 mb-6 rounded-lg">
          {/* Active Preset Information Banner */}
          <div className="mb-6 px-3.5 py-2.5 rounded-md bg-[#fafaf7] border border-[#e6e5e0] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:key-round" className="w-4 h-4 text-[#f54e00]" />
              <div>
                <span className="text-[#26251e] font-medium">{activePreset.label}</span>
                <span className="text-[#807d72] ml-1.5 text-[11px]">({activePreset.description})</span>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              {activePreset.role}
            </Badge>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                Email / User Identifier
              </label>
              <div className="relative">
                <Icon icon="lucide:mail" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72]" />
                <Input 
                  id="login-email-input"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-9"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                Password
              </label>
              <div className="relative">
                <Icon icon="lucide:lock" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72]" />
                <Input 
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-9 pr-10 font-mono"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#5a5852] hover:text-[#26251e] transition-colors">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-[#cfcdc4] text-[#f54e00] focus:ring-[#f54e00] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Remember session</span>
              </label>
              <button 
                type="button"
                onClick={() => info('Password reset instructions sent to registered contact.', 'Reset Password')} 
                className="text-[#807d72] hover:text-[#f54e00] font-medium transition-colors cursor-pointer"
              >
                Reset Password
              </button>
            </div>

            <Button
              type="submit"
              id="staff-login-submit-btn"
              variant="primary"
              size="lg"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full text-xs font-semibold uppercase tracking-wider mt-4"
            >
              <span>Sign In to {activePreset.label}</span>
              <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </Card>

        {/* Credential Reference & Quick Login Cards */}
        <div className="pt-4 border-t border-[#e6e5e0]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#807d72] font-semibold mb-3 text-center">
            Configured Role Credentials
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_ACCOUNTS.map((preset) => {
              const isCurrent = email === preset.email;
              return (
                <button
                  key={preset.role}
                  id={`quick-login-${preset.role.toLowerCase().replace('_', '-')}-btn`}
                  onClick={() => handleQuickDemoLogin(preset.role)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all cursor-pointer text-left ${
                    isCurrent
                      ? 'bg-white border-[#26251e]'
                      : 'bg-[#fafaf7] hover:bg-white border-[#e6e5e0]'
                  }`}
                >
                  <Icon icon={preset.icon} className="w-4 h-4 text-[#807d72]" />
                  <div className="text-center w-full">
                    <div className="text-[10px] font-semibold text-[#26251e] uppercase tracking-wider truncate">
                      {preset.label}
                    </div>
                    <div className="text-[9px] text-[#5a5852] font-mono mt-0.5 truncate">
                      {preset.email}
                    </div>
                    <div className="text-[9px] text-[#f54e00] font-mono mt-0.5 font-medium">
                      {preset.password}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
