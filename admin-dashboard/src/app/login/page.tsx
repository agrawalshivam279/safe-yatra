'use client';

/**
 * Safe Yatra — Admin Command Center Login Page
 * High-security authentication portal for incident commanders and safety officers.
 */

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleQuickFill = () => {
    setEmail('admin@safeyatra.in');
    setPassword('Admin@123456');
    setErrors({});
    setApiError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
      });
      router.push('/');
    } catch (err: any) {
      setApiError(err.message || 'Authentication failed. Please verify your administrator credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Ambience Gradient */}
      <div className="absolute inset-0 bg-radial-gradient from-primary-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-xl shadow-primary-950/60 ring-1 ring-primary-400/30">
            <span className="text-2xl" role="img" aria-label="Shield">
              🛡️
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Safe Yatra Command Center
          </h1>
          <p className="text-xs text-primary-300 font-medium tracking-wide uppercase">
            Authorized Personnel Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Quick Fill Demo Banner for Judges */}
          <div className="mb-6 flex items-center justify-between rounded-lg border border-primary-800/60 bg-primary-950/50 p-3">
            <div className="flex items-center space-x-2 text-xs text-primary-200">
              <Sparkles className="h-4 w-4 text-primary-400" />
              <span>SIH Evaluation Mode</span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              data-testid="quick-fill-btn"
              className="inline-flex items-center space-x-1 rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-500 active:bg-primary-700"
            >
              <span>Quick Fill Admin</span>
            </button>
          </div>

          {/* Error Alert */}
          {apiError && (
            <div
              role="alert"
              data-testid="api-error-alert"
              className="mb-6 flex items-start space-x-3 rounded-lg border border-rose-800/60 bg-rose-950/50 p-3.5 text-xs text-rose-200"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Officer Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="commander@safeyatra.in"
                  aria-invalid={Boolean(errors.email)}
                  data-testid="email-input"
                  className={`block w-full rounded-lg border bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                  }`}
                />
              </div>
              {errors.email && (
                <p data-testid="email-error" className="mt-1 text-xs text-rose-400">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••••••"
                  aria-invalid={Boolean(errors.password)}
                  data-testid="password-input"
                  className={`block w-full rounded-lg border bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.password ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="toggle-password-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p data-testid="password-error" className="mt-1 text-xs text-rose-400">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isAuthLoading}
              data-testid="submit-login-btn"
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-primary-950/50 transition-all hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Authenticate & Enter</span>
                </div>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Restricted system. Access logged under Smart Tourist Safety Protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
