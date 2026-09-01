import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Check, 
  UserCheck, 
  Building2, 
  Layers
} from 'lucide-react';
import { queueStore } from '../../services/store';
import { UserRole } from '../../types';

export const Screen08Login: React.FC = () => {
  const [email, setEmail] = useState('admin@organization.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      queueStore.setRole('STAFF');
      queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
    }, 400);
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    queueStore.setRole(role);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Decorative / Brand Column */}
        <div className="bg-[#0F172A] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background blurs */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#00ACC1]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00ACC1]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl bg-[#00ACC1] flex items-center justify-center font-bold text-white text-lg shadow-sm italic">
                A
              </div>
              <span className="font-black tracking-wider text-base text-white">ALIGN</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00ACC1]/20 text-[#00ACC1]">STAFF</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white leading-snug tracking-tight mb-3">
              Operational Precision. Real-time Control.
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Log in to your assigned counter console to manage live token queues, call walk-ins, and broadcast audio announcements.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00ACC1]" />
              <span>Multi-Tenant Role-Based Access Control</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00ACC1]" />
              <span>Instant WebSocket / Real-time Sync</span>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
                Staff Authentication
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Enter your staff credentials to access the operational desk.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1] focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#00ACC1] focus:ring-[#00ACC1]"
                  />
                  <span>Remember Counter Session</span>
                </label>
                <a href="#reset" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to admin@organization.com'); }} className="text-[#00ACC1] hover:underline font-bold">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                id="staff-login-submit-btn"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 uppercase tracking-wider"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Counter 3</span>
                    <ArrowRight className="w-4 h-4 text-[#00ACC1]" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Role Switcher Shortcuts */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
              Quick Role Test Logins
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickDemoLogin('STAFF')}
                className="p-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800">
                  <UserCheck className="w-3 h-3 text-[#00ACC1]" />
                  <span>Staff</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Counter 3</div>
              </button>

              <button
                onClick={() => handleQuickDemoLogin('ORG_ADMIN')}
                className="p-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800">
                  <Building2 className="w-3 h-3 text-[#00ACC1]" />
                  <span>Org Admin</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">ABC HQ</div>
              </button>

              <button
                onClick={() => handleQuickDemoLogin('PLATFORM_ADMIN')}
                className="p-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800">
                  <Layers className="w-3 h-3 text-[#00ACC1]" />
                  <span>Platform</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Global Super</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
