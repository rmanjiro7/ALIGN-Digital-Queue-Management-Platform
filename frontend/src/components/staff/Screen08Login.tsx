import React, { useState } from 'react';
import { queueStore } from '../../services/store';
import { UserRole } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

const SECTORS = [
  'Healthcare',
  'Government & Public Sector',
  'Enterprise Retail',
  'Financial Services & Banking',
  'Corporate & Technology',
  'Higher Education'
];

export const Screen08Login: React.FC = () => {
  const { error: toastError, success: toastSuccess, info } = useToast();
  const appState = queueStore.getState();

  // Mode: Sign In vs Create Account
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Sign In State (Clean: no dummy auto-fills)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('STAFF');
  const [regOrgId, setRegOrgId] = useState<string>(appState.tenants[0]?.id || '');
  const [isNewOrg, setIsNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSector, setNewOrgSector] = useState(SECTORS[0]);
  const [regLocationId, setRegLocationId] = useState<string>(appState.locations[0]?.id || '');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    if (!loginEmail || !loginPass) {
      toastError('Please enter both email and password.', 'Validation');
      return;
    }

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validation
    if (!regName.trim()) {
      setRegError('Full Name is required.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please provide a valid work email address.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify and retype.');
      return;
    }
    if (regRole === 'ORG_ADMIN' && isNewOrg && !newOrgName.trim()) {
      setRegError('Please specify an Organization Name.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: regName.trim(),
        email: regEmail.toLowerCase().trim(),
        password: regPassword,
        role: regRole,
        orgId: regRole === 'PLATFORM_ADMIN' ? undefined : (isNewOrg ? undefined : regOrgId),
        newOrgName: isNewOrg ? newOrgName.trim() : undefined,
        newOrgSector: isNewOrg ? newOrgSector : undefined,
        locationId: regRole === 'STAFF' ? regLocationId : undefined
      };

      const response = await apiClient.register(payload);

      // Save user to local store
      queueStore.registerStaffUser({
        name: payload.name,
        email: payload.email,
        role: payload.role as any,
        orgId: payload.orgId,
        newOrgName: payload.newOrgName,
        newOrgSector: payload.newOrgSector,
        locationId: payload.locationId
      });

      // Update store with authentication state
      queueStore.setAuthStatus('AUTHENTICATED', response.user);
      queueStore.setRole(regRole);

      toastSuccess(`Welcome, ${regName}! Your ${regRole} console is activated.`, 'Registration Complete');

      // Navigate to corresponding console
      if (regRole === 'ORG_ADMIN') {
        queueStore.setScreen('SCREEN_12_ORG_DASHBOARD');
      } else if (regRole === 'PLATFORM_ADMIN') {
        queueStore.setScreen('SCREEN_15_PLATFORM_DASHBOARD');
      } else {
        queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please check inputs.');
      toastError(err.message || 'Registration failed', 'Registration Error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter locations for selected org
  const orgLocations = appState.locations.filter(l => l.orgId === regOrgId);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header / Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-10 h-10 rounded-md bg-[#26251e] text-[#f7f7f4] flex items-center justify-center mb-4">
            <span className="font-semibold text-lg">A</span>
          </div>
          <h1 className="text-display-md text-[#26251e] mb-1">
            ALIGN System Access
          </h1>
          <p className="text-sm text-[#5a5852] max-w-sm">
            Console access for Staff Operators &amp; Administrators. End-users queue anonymously without an account.
          </p>
        </div>

        {/* Mode Toggle: Sign In vs Create Account */}
        <div className="bg-[#efeee8] p-1 rounded-lg mb-6 flex gap-1 border border-[#e6e5e0]">
          <button
            type="button"
            id="tab-signin-btn"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-white text-[#26251e] shadow-xs'
                : 'text-[#807d72] hover:text-[#26251e]'
            }`}
          >
            <Icon icon="lucide:log-in" className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            id="tab-register-btn"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-white text-[#26251e] shadow-xs'
                : 'text-[#807d72] hover:text-[#26251e]'
            }`}
          >
            <Icon icon="lucide:user-plus" className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {mode === 'login' ? (
          /* Login Form */
          <Card className="p-8 md:p-10 mb-6 rounded-lg">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                  Email Address
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
                <span>Sign In</span>
                <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-1.5" />
              </Button>

              <div className="text-center pt-3 border-t border-[#efeee8] mt-4">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs text-[#807d72] hover:text-[#f54e00] transition-colors cursor-pointer"
                >
                  Don't have an operator account? <span className="underline font-semibold text-[#26251e]">Create one</span>
                </button>
              </div>
            </form>
          </Card>
        ) : (
          /* Create Account / Registration Form */
          <Card className="p-8 md:p-10 mb-6 rounded-lg animate-in fade-in duration-200">
            <div className="mb-6 pb-4 border-b border-[#efeee8]">
              <h2 className="text-lg font-semibold text-[#26251e]">
                New Operator / Admin Account
              </h2>
              <p className="text-xs text-[#73726c] mt-0.5">
                Create a registered account for station operations or organization management.
              </p>
            </div>

            {regError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between">
                <span>{regError}</span>
                <button
                  type="button"
                  onClick={() => setRegError(null)}
                  className="text-red-500 hover:text-red-800 ml-2 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                  Select Desired Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('STAFF')}
                    className={`p-2.5 rounded-md border text-center transition-all cursor-pointer ${
                      regRole === 'STAFF'
                        ? 'border-[#26251e] bg-[#fafaf7] text-[#26251e] font-semibold'
                        : 'border-[#e6e5e0] text-[#5a5852] hover:border-[#cfcdc4]'
                    }`}
                  >
                    <Icon icon="lucide:user-check" className="w-4 h-4 mx-auto mb-1 text-[#f54e00]" />
                    <div className="text-xs">Staff</div>
                    <div className="text-[9px] font-mono text-[#807d72]">Counter Ops</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('ORG_ADMIN')}
                    className={`p-2.5 rounded-md border text-center transition-all cursor-pointer ${
                      regRole === 'ORG_ADMIN'
                        ? 'border-[#26251e] bg-[#fafaf7] text-[#26251e] font-semibold'
                        : 'border-[#e6e5e0] text-[#5a5852] hover:border-[#cfcdc4]'
                    }`}
                  >
                    <Icon icon="lucide:building-2" className="w-4 h-4 mx-auto mb-1 text-[#f54e00]" />
                    <div className="text-xs">Org Admin</div>
                    <div className="text-[9px] font-mono text-[#807d72]">Tenant Lead</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('PLATFORM_ADMIN')}
                    className={`p-2.5 rounded-md border text-center transition-all cursor-pointer ${
                      regRole === 'PLATFORM_ADMIN'
                        ? 'border-[#26251e] bg-[#fafaf7] text-[#26251e] font-semibold'
                        : 'border-[#e6e5e0] text-[#5a5852] hover:border-[#cfcdc4]'
                    }`}
                  >
                    <Icon icon="lucide:shield-check" className="w-4 h-4 mx-auto mb-1 text-[#f54e00]" />
                    <div className="text-xs">Platform</div>
                    <div className="text-[9px] font-mono text-[#807d72]">Super Admin</div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                  Full Name
                </label>
                <div className="relative">
                  <Icon icon="lucide:user" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72]" />
                  <Input
                    id="register-name-input"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9"
                    placeholder="e.g. Johnathan Miller"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                  Work Email Address
                </label>
                <div className="relative">
                  <Icon icon="lucide:mail" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#807d72]" />
                  <Input
                    id="register-email-input"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9"
                    placeholder="operator@organization.com"
                  />
                </div>
              </div>

              {/* Organization & Location Configuration */}
              {regRole !== 'PLATFORM_ADMIN' && (
                <div className="p-3.5 bg-[#fafaf7] border border-[#e6e5e0] rounded-md space-y-3">
                  {regRole === 'ORG_ADMIN' && (
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[#e6e5e0]">
                      <span className="font-semibold text-[#26251e]">Organization Assignment</span>
                      <button
                        type="button"
                        onClick={() => setIsNewOrg(!isNewOrg)}
                        className="text-[#f54e00] hover:underline font-mono text-[11px] cursor-pointer"
                      >
                        {isNewOrg ? '← Choose Existing Org' : '+ Register New Org'}
                      </button>
                    </div>
                  )}

                  {isNewOrg && regRole === 'ORG_ADMIN' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] block mb-1">
                          New Organization Name
                        </label>
                        <Input
                          id="register-new-org-name"
                          type="text"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="e.g. Apex Medical Care"
                          className="text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] block mb-1">
                          Sector / Industry
                        </label>
                        <select
                          value={newOrgSector}
                          onChange={(e) => setNewOrgSector(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-[#e6e5e0] bg-white text-xs font-sans text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                        >
                          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] block mb-1">
                        Select Organization
                      </label>
                      <select
                        id="register-org-select"
                        value={regOrgId}
                        onChange={(e) => setRegOrgId(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-[#e6e5e0] bg-white text-xs font-sans text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                      >
                        {appState.tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.sector})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {regRole === 'STAFF' && (
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] block mb-1">
                        Assigned Branch / Location
                      </label>
                      <select
                        id="register-location-select"
                        value={regLocationId}
                        onChange={(e) => setRegLocationId(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-[#e6e5e0] bg-white text-xs font-sans text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                      >
                        {orgLocations.length > 0 ? (
                          orgLocations.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name} - {l.subtitle || l.city}
                            </option>
                          ))
                        ) : (
                          appState.locations.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name} - {l.subtitle || l.city}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                    Password (min 8 chars)
                  </label>
                  <div className="relative">
                    <Input
                      id="register-password-input"
                      type={regShowPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="••••••••"
                      className="pr-8 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setRegShowPassword(!regShowPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#807d72] hover:text-[#26251e]"
                    >
                      <Icon icon={regShowPassword ? 'lucide:eye-off' : 'lucide:eye'} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#5a5852] font-semibold block">
                    Confirm Password
                  </label>
                  <Input
                    id="register-confirm-password-input"
                    type={regShowPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                id="register-submit-btn"
                variant="primary"
                size="lg"
                disabled={isLoading}
                isLoading={isLoading}
                className="w-full text-xs font-semibold uppercase tracking-wider mt-2"
              >
                <Icon icon="lucide:user-check" className="w-4 h-4 mr-1.5" />
                <span>Create Account &amp; Activate Console</span>
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-[#807d72] hover:text-[#26251e] underline cursor-pointer"
                >
                  Already have an account? Sign in here
                </button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};
