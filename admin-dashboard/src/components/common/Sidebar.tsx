'use client';

/**
 * Safe Yatra — Admin Dashboard Sidebar Navigation
 * Client component with active route detection, socket indicator, and admin profile badge.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  AlertOctagon,
  ShieldAlert,
  Users,
  Radio,
  BarChart3,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { socketService } from '../../services/socketService';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Heatmap', href: '/heatmap', icon: Map },
  { name: 'Live SOS', href: '/sos', icon: AlertOctagon, badge: 'LIVE' },
  { name: 'Danger Zones', href: '/zones', icon: ShieldAlert },
  { name: 'Volunteers', href: '/volunteers', icon: Users },
  { name: 'Broadcast', href: '/broadcast', icon: Radio },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, token, logout, isAuthenticated } = useAuth();
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      const socket = socketService.connect(token);
      setIsSocketConnected(socket.connected);

      const unsubConnect = socketService.onConnect(() => setIsSocketConnected(true));
      const unsubDisconnect = socketService.onDisconnect(() => setIsSocketConnected(false));

      return () => {
        unsubConnect();
        unsubDisconnect();
      };
    }
  }, [token]);

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col h-full border-r border-primary-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-primary-800 bg-primary-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl" role="img" aria-label="Shield">
              🛡️
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Safe Yatra</h1>
              <p className="text-xs font-medium text-primary-300">Command Center</p>
            </div>
          </div>
          {/* Live Socket Status Indicator */}
          <div
            className={`flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              isSocketConnected
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                : 'bg-rose-950 text-rose-300 border border-rose-700/50'
            }`}
            title={isSocketConnected ? 'Real-time Gateway Online' : 'Gateway Offline / Reconnecting'}
          >
            {isSocketConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYNC</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin Navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-950/20'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-primary-300'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Officer Profile Footer */}
      <div className="p-3 border-t border-primary-800 bg-primary-950/40">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-primary-800/40">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-semibold text-white truncate">{user.name || 'Safety Officer'}</span>
              <span className="text-[11px] text-primary-300 truncate">{user.email}</span>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-md hover:bg-primary-700 text-primary-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 rounded-lg bg-primary-800/20 text-xs text-primary-300">
            <span>Session: Guest / Logging In</span>
          </div>
        )}
      </div>
    </aside>
  );
}
