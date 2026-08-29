/**
 * Safe Yatra — Admin Dashboard
 * Root layout with QueryProvider, AuthProvider, and Sidebar navigation.
 */

import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '../providers/QueryProvider';
import { AuthProvider } from '../context/AuthContext';
import { Sidebar } from '../components/common/Sidebar';

export const metadata: Metadata = {
  title: 'Safe Yatra — Command Center',
  description: 'Proactive tourist safety monitoring, SOS emergency dispatch, and dynamic hazard zoning command center.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <QueryProvider>
          <AuthProvider>
            <div className="flex h-screen overflow-hidden">
              {/* Sidebar Navigation */}
              <Sidebar />

              {/* Main Command Center Content Stage */}
              <main className="flex-1 overflow-y-auto bg-slate-100/70 p-6">
                {children}
              </main>
            </div>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
