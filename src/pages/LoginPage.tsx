import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Eye, EyeOff, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = "http://localhost:8000";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = 'Invalid credentials';
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          errorMsg = res.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      login(data.access_token, username.trim());
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#09090b] font-sans selection:bg-[#d4c29d]/30 selection:text-white">
      {/* ── Background Port Image (Balanced & Subtle Night Port) ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/port_auth_bg.jpg"
          alt="Commercial Shipping Port Terminal"
          className="w-full h-full object-cover object-center filter brightness-[0.48] contrast-[1.10] saturate-[1.10] scale-105 transform motion-safe:transition-transform motion-safe:duration-1000"
        />
        {/* Soft, slightly deeper cinematic overlays for comfortable contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#030e1a]/68 to-[#030e1a]/72" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#09090b]/45 to-[#09090b]/90" />
      </div>

      {/* ── Top Brand Header ── */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4c29d]/15 border border-[#d4c29d]/30 shadow-sm shadow-[#d4c29d]/10 shrink-0">
            <span className="text-xs font-black font-mono tracking-tight text-[#d4c29d] select-none">
              FIQ
            </span>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Freight<span className="text-[#d4c29d]">IQ</span>
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-lg backdrop-blur-md transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* ── Main Authentication Card (Layout & Style matching reference - Subdued Dark) ── */}
      <div className="relative z-10 w-full max-w-[420px] my-auto">
        {/* Card Body */}
        <div className="relative rounded-[26px] border border-white/[0.08] bg-[#070c16]/95 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black">
          
          {/* Top Circular Profile Avatar Badge */}
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-full border border-white/[0.12] bg-white/[0.03] flex items-center justify-center shadow-inner">
              <User className="h-8 w-8 text-neutral-300 stroke-[1.5]" />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3.5 py-2.5 rounded-xl mb-6 text-xs text-left backdrop-blur-sm animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="flex-1 leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email / Username Underline Input */}
            <div className="group relative border-b border-white/[0.12] hover:border-white/[0.22] focus-within:!border-[#d4c29d]/75 transition-colors pb-2 pt-1 flex items-center gap-3">
              <Mail className="h-5 w-5 text-neutral-500 group-focus-within:text-[#d4c29d] transition-colors shrink-0" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email ID"
                className="w-full bg-transparent text-neutral-100 placeholder:text-neutral-500 text-[15px] font-normal tracking-wide focus:outline-none"
                required
                autoComplete="username"
              />
            </div>

            {/* Password Underline Input */}
            <div className="group relative border-b border-white/[0.12] hover:border-white/[0.22] focus-within:!border-[#d4c29d]/75 transition-colors pb-2 pt-1 flex items-center gap-3">
              <Lock className="h-5 w-5 text-neutral-500 group-focus-within:text-[#d4c29d] transition-colors shrink-0" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-neutral-100 placeholder:text-neutral-500 text-[15px] font-normal tracking-wide focus:outline-none pr-2"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-0.5"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Remember Me Row */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-[13px] text-neutral-400 hover:text-neutral-200 transition-colors group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/50 text-[#d4c29d] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#d4c29d]"
                />
                <span className="font-normal text-neutral-400 group-hover:text-neutral-200 transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            {/* Action Buttons Stack (LOGIN + REGISTER) */}
            <div className="pt-4 space-y-3">
              {/* Primary LOGIN Button */}
              <button
                id="login-submit-button"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#d4c29d] hover:bg-[#c4b087] text-neutral-950 font-bold text-sm tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>LOGIN</span>
                )}
              </button>

              {/* Secondary REGISTER Button */}
              <Link
                id="login-to-register-link"
                to="/register"
                className="w-full block text-center py-3.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white font-semibold text-sm tracking-wider uppercase transition-all active:scale-[0.99]"
              >
                REGISTER
              </Link>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

