import React, { useState, useEffect } from 'react';
import { Sidebar, KPICard, ChartCard, TransactionsList } from './admin';
import { RevenueCard } from './admin/RevenueCard';
import { Period, DashboardMetrics } from '../types/admin';
import { getMockDashboardMetrics } from '../services/adminService';
import { ArrowLeft, Loader2 } from 'lucide-react';

type AdminView = 'dashboard' | 'users' | 'products' | 'stripe';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      setMetrics(getMockDashboardMetrics(period));
      setIsLoading(false);
    }, 500);
  }, [period]);

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
