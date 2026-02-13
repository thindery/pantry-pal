import { DashboardMetrics, Period, Transaction, AnalyticsEvent } from '../types/admin';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Dashboard API
export const getDashboardMetrics = (period: Period = '7d'): Promise<DashboardMetrics> =>
  fetchApi<DashboardMetrics>(`/api/admin/dashboard?period=${period}`);

export const getTransactions = (limit: number = 10): Promise<Transaction[]> =>
  fetchApi<Transaction[]>(`/api/admin/transactions?limit=${limit}`);

export const getAnalyticsEvents = (eventType?: string, limit: number = 50): Promise<AnalyticsEvent[]> =>
  fetchApi<AnalyticsEvent[]>(`/api/admin/analytics?${eventType ? `type=${eventType}&` : ''}limit=${limit}`);

// For MVP: Mock data until backend is fully implemented
export const getMockDashboardMetrics = (period: Period = '7d'): DashboardMetrics => {
  // Generate mock logins data based on period
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const loginsData = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 20,
    };
  });

  return {
    users: {
      total: 1247,
      growth: 12.5,
      sparkline: [45, 52, 48, 65, 72, 68, 78, 85, 82, 90],
    },
    products: {
      total: 892,
      growth: 5.2,
      sparkline: [120, 135, 128, 142, 155, 148, 162, 175, 168, 182],
    },
    revenue: {
      lifetime: 47294,
      momGrowth: 8.3,
      trend: [3200, 3800, 4100, 3900, 4500, 4800, 5200, 4900, 5600, 5800],
    },
    logins: {
      data: loginsData,
    },
    transactions: [
      { id: 'txn_1', userId: 'usr_1', userEmail: 'alice@example.com', amount: 29, status: 'success', timestamp: '2026-02-12T18:30:00Z', description: 'Pro Plan - Monthly' },
      { id: 'txn_2', userId: 'usr_2', userEmail: 'bob@example.com', amount: 99, status: 'success', timestamp: '2026-02-12T15:45:00Z', description: 'Family Plan - Yearly' },
      { id: 'txn_3', userId: 'usr_3', userEmail: 'charlie@example.com', amount: 29, status: 'failed', timestamp: '2026-02-12T12:15:00Z', description: 'Pro Plan - Monthly' },
      { id: 'txn_4', userId: 'usr_4', userEmail: 'diana@example.com', amount: 29, status: 'success', timestamp: '2026-02-11T22:00:00Z', description: 'Pro Plan - Monthly' },
      { id: 'txn_5', userId: 'usr_5', userEmail: 'evan@example.com', amount: 99, status: 'pending', timestamp: '2026-02-11T19:20:00Z', description: 'Family Plan - Yearly' },
      { id: 'txn_6', userId: 'usr_6', userEmail: 'fiona@example.com', amount: 29, status: 'success', timestamp: '2026-02-11T14:10:00Z', description: 'Pro Plan - Monthly' },
    ],
    alerts: {
      failedPayments: 1,
    },
  };
};
