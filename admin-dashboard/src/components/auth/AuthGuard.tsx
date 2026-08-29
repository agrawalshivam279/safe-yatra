'use client';

/**
 * Safe Yatra — Admin Dashboard Route AuthGuard
 * Enforces session authentication and administrator privileges across routes.
 */

import React, { useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../common/Sidebar';

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoading) return;

    if (isLoginPage) {
      if (isAuthenticated && user?.role === 'ADMIN') {
        router.replace('/');
      }
    } else {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, isLoginPage, router, user]);

  // Loading state with polished command center pulse
  if (isLoading) {
    return (
      <div
        data-testid="authguard-loading"
        className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 text-white"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 rounded-full bg-primary-500/20 animate-ping" />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-950/40">
              <Shield className="h-6 w-6 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold tracking-wide text-white">Safe Yatra Command Center</h2>
            <p className="text-xs text-primary-300 mt-1 flex items-center justify-center space-x-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-400" />
              <span>Verifying safety officer credentials...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login page layout without sidebar
  if (isLoginPage) {
    if (isAuthenticated && user?.role === 'ADMIN') {
      return null;
    }
    return (
      <div data-testid="authguard-login-stage" className="min-h-screen w-full bg-slate-900">
        {children}
      </div>
    );
  }

  // Protected route layout with sidebar
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div data-testid="authguard-protected-stage" className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-100/70 p-6">{children}</main>
    </div>
  );
}
