/**
 * Safe Yatra — Admin Dashboard Home
 * Overview page with KPI cards and live feed.
 */

export default function DashboardHome() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
      <p className="text-gray-500 mb-8">Real-time monitoring of the Safe Yatra ecosystem</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <p className="text-sm text-gray-500 uppercase">Active SOS</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 uppercase">Active Tourists</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-500 uppercase">On-Duty Mitras</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 uppercase">Critical Zones</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
      </div>

      {/* Placeholder for map + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 min-h-[400px]">
          <h2 className="text-lg font-semibold mb-4">🗺️ Live Heatmap</h2>
          <div className="bg-gray-100 rounded-lg h-80 flex items-center justify-center text-gray-400">
            Mapbox GL heatmap will render here
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 min-h-[400px]">
          <h2 className="text-lg font-semibold mb-4">🆘 Live SOS Feed</h2>
          <div className="space-y-3">
            <p className="text-gray-400 text-center py-8">No active SOS events</p>
          </div>
        </div>
      </div>
    </div>
  );
}
