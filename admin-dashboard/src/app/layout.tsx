/**
 * Safe Yatra — Admin Dashboard
 * Root layout with QueryProvider, AuthProvider, and AuthGuard.
 */

import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '../providers/QueryProvider';
import { AuthProvider } from '../context/AuthContext';
import { AuthGuard } from '../components/auth/AuthGuard';

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
            <AuthGuard>{children}</AuthGuard>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
