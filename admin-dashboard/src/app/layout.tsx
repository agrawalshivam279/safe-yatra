/**
 * Safe Yatra — Admin Dashboard
 * Root layout with sidebar navigation.
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Safe Yatra — Command Center',
  description: 'Admin dashboard for monitoring tourist safety, SOS events, and danger zones.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-primary-500 text-white flex flex-col">
            <div className="p-6 border-b border-primary-400">
              <h1 className="text-xl font-bold">🛡️ Safe Yatra</h1>
              <p className="text-sm text-primary-200 mt-1">Command Center</p>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {/* TODO: Add navigation links */}
              <a href="/" className="block px-4 py-2 rounded hover:bg-primary-400">📊 Dashboard</a>
              <a href="/heatmap" className="block px-4 py-2 rounded hover:bg-primary-400">🗺️ Heatmap</a>
              <a href="/sos" className="block px-4 py-2 rounded hover:bg-primary-400">🆘 Live SOS</a>
              <a href="/zones" className="block px-4 py-2 rounded hover:bg-primary-400">🚧 Zones</a>
              <a href="/volunteers" className="block px-4 py-2 rounded hover:bg-primary-400">👥 Volunteers</a>
              <a href="/broadcast" className="block px-4 py-2 rounded hover:bg-primary-400">📢 Broadcast</a>
              <a href="/analytics" className="block px-4 py-2 rounded hover:bg-primary-400">📈 Analytics</a>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
