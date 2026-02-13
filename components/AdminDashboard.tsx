import React, { useState, useEffect } from 'react';
import { Sidebar, KPICard, ChartCard, TransactionsList } from './admin';
import { RevenueCard } from './admin/RevenueCard';
import { Period, DashboardMetrics } from '../types/admin';
import { getMockDashboardMetrics } from '../services/adminService';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

type AdminView = 'dashboard' | 'errors' | 'users' | 'products' | 'stripe';

interface ClientError {
  id: string;
  user_id: string | null;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  component: string | null;
  url: string | null;
  user_agent: string | null;
  resolved: boolean;
  created_at: string;
}

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      setMetrics(getMockDashboardMetrics(period));
      setIsLoading(false);
    }, 500);
  }, [period]);

  // Fetch errors when viewing errors tab
  useEffect(() => {
    if (activeView === 'errors') {
      setLoadingErrors(true);
      fetch('/api/client-errors?resolved=false')
        .then(r => r.json())
        .then(data => setErrors(data.errors || []))
        .catch(console.error)
        .finally(() => setLoadingErrors(false));
    }
  }, [activeView]);

  // Handle resolve error
  const resolveError = async (id: string) => {
    try {
      const res = await fetch(`/api/client-errors/${id}/resolve`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setErrors(errors.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to resolve error:', err);
    }
  };

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to App</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-200 rounded-full" />
          </div>
        </div>

        {/* Dashboard content */}
        {activeView === 'dashboard' && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500">Overview of your app performance</p>
            </div>

            {/* Top row: 3 KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <KPICard
                title="Total Users"
                value={metrics.users.total.toLocaleString()}
                growth={metrics.users.growth}
                sparklineData={metrics.users.sparkline}
                color="emerald"
              />
              <KPICard
                title="Products"
                value={metrics.products.total.toLocaleString()}
                growth={metrics.products.growth}
                sparklineData={metrics.products.sparkline}
                color="blue"
              />
              <RevenueCard
                lifetime={metrics.revenue.lifetime}
                momGrowth={metrics.revenue.momGrowth}
                trendData={metrics.revenue.trend}
              />
            </div>

            {/* Middle row: Logins chart */}
            <ChartCard
              title="Daily Active Logins"
              data={metrics.logins.data}
              period={period}
              onPeriodChange={setPeriod}
            />

            {/* Bottom row: Transactions + Alerts */}
            <TransactionsList
              transactions={metrics.transactions}
              failedCount={metrics.alerts.failedPayments}
            />
          </div>
        )}

        {activeView === 'errors' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Client Errors</h1>
                <p className="text-slate-500">Errors reported from client applications</p>
              </div>
            </div>
            
            {loadingErrors ? (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading errors...</span>
              </div>
            ) : errors.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-500">No unresolved errors! 🎉</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Message</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Component</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map(err => (
                      <tr key={err.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(err.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-rose-600">
                          {err.error_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate" title={err.error_message}>
                          {err.error_message}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {err.component || 'Unknown'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => resolveError(err.id)}
                            className="flex items-center gap-2 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Resolve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Placeholder views for other nav items */}
        {activeView === 'users' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Users</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500">User management coming in Phase 2</p>
            </div>
          </div>
        )}

        {activeView === 'products' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Products</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500">Product management coming in Phase 2</p>
            </div>
          </div>
        )}

        {activeView === 'stripe' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Stripe Events</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500">Stripe event logs coming in Phase 2</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
