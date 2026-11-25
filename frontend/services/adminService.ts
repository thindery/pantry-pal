import type { DashboardMetrics, Period, Transaction, AnalyticsEvent } from '../types/admin';

import { getApiBaseUrl } from '@/lib/env';

const API_URL = getApiBaseUrl();

export interface FunnelBreakdown {
  period: number;
  allTime: number;
}

export interface FunnelConversions {
  period: number;
  allTime: number;
  pro: FunnelBreakdown;
  family: FunnelBreakdown;
}

export interface FunnelMetrics {
  period: Period;
  signups: FunnelBreakdown;
  trials: FunnelBreakdown;
  paidConversions: FunnelConversions;
  churned: FunnelBreakdown;
  cancelScheduled: FunnelBreakdown;
  signupsPeriod?: number;
  signupsAllTime?: number;
  trialsPeriod?: number;
  trialsAllTime?: number;
  proConversions?: number;
  proConversionsAllTime?: number;
  familyConversions?: number;
  familyConversionsAllTime?: number;
  paidConversionsPeriod?: number;
  paidConversionsAllTime?: number;
  churnedPeriod?: number;
  churnedAllTime?: number;
  cancelScheduledPeriod?: number;
  cancelScheduledAllTime?: number;
}

export interface EmailConfig {
  resend_configured: boolean;
  from_address: string;
  webhook_secret_present: boolean;
}

export interface EmailTemplateCount {
  template: string;
  count: number;
}

export interface EmailDayCount {
  day: string;
  count: number;
}

export interface EmailRates {
  delivered: number;
  bounced: number;
  complained: number;
  total_sent: number;
}

export interface EmailRecentFailure {
  created_at: string;
  template: string;
  to_email: string;
  error_message: string;
}

export interface EmailSuppressionItem {
  email: string;
  reason: string;
  created_at: string;
}

export interface EmailSuppressions {
  count: number;
  items: EmailSuppressionItem[];
}

export interface EmailRecentSend {
  created_at: string;
  to_email: string;
  template: string;
  subject: string;
  status: string;
  resend_id: string | null;
}

export interface EmailMetrics {
  period: Period;
  config: EmailConfig;
  sends_by_template: EmailTemplateCount[];
  sends_by_day: EmailDayCount[];
  status_counts: Record<string, number>;
  rates: EmailRates | null;
  rates_reason: string | null;
  recent_failures: EmailRecentFailure[];
  suppressions: EmailSuppressions;
  recent_sends: EmailRecentSend[];
}

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
export const getDashboardMetrics = async (period: Period = '7d'): Promise<DashboardMetrics> => {
  const res = await fetchApi<DashboardMetrics | { success: boolean; data: DashboardMetrics }>(
    `/api/admin/dashboard?period=${period}`
  );
  if (res && typeof res === 'object' && 'data' in res && res.data) {
    return (res as { data: DashboardMetrics }).data;
  }
  return res as DashboardMetrics;
};

export const getFunnelMetrics = async (period: Period = '7d'): Promise<FunnelMetrics> => {
  const res = await fetchApi<FunnelMetrics | { success: boolean; data: FunnelMetrics }>(
    `/api/admin/funnel?period=${period}`
  );
  if (res && typeof res === 'object' && 'data' in res && res.data) {
    return (res as { data: FunnelMetrics }).data;
  }
  return res as FunnelMetrics;
};

export const getEmailMetrics = async (period: Period = '7d'): Promise<EmailMetrics> => {
  const res = await fetchApi<EmailMetrics | { success: boolean; data: EmailMetrics }>(
    `/api/admin/email-metrics?period=${period}`
  );
  if (res && typeof res === 'object' && 'data' in res && res.data) {
    return (res as { data: EmailMetrics }).data;
  }
  return res as EmailMetrics;
};

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
