import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { queueStore } from '../../services/store';

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
      
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Invalid credentials or account disabled');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 font-sans select-none relative overflow-hidden">
      {/* Background ambient lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00ACC1]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#00ACC1]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#1E293B] rounded-3xl p-8 border border-slate-700 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#00ACC1] flex items-center justify-center font-black text-[#0F172A] text-3xl shadow-lg mb-4">
            A
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">ALIGN</h1>
          <p className="text-slate-400 font-mono text-sm mt-1">DISPLAY & STAFF LOGIN</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {status === 'error' && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
              {errorMessage}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F172A] text-white border border-slate-700 rounded-xl px-12 py-3.5 focus:outline-none focus:border-[#00ACC1] transition-colors"
                required
                disabled={status === 'loading'}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] text-white border border-slate-700 rounded-xl px-12 py-3.5 focus:outline-none focus:border-[#00ACC1] transition-colors"
                required
                disabled={status === 'loading'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-[#00ACC1] hover:bg-[#0097a7] text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-mono">
          <Building2 className="w-3.5 h-3.5" />
          <span>ALIGN Queue Management Platform</span>
        </div>
      </div>
    </div>
  );
};
