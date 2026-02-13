// Admin Dashboard Types

export type Period = '7d' | '30d' | '90d';

export interface DashboardMetrics {
  users: {
    total: number;
    growth: number; // percentage
    sparkline: number[];
  };
  products: {
    total: number;
    growth: number;
    sparkline: number[];
  };
  revenue: {
    lifetime: number;
    momGrowth: number; // month-over-month
    trend: number[];
  };
  logins: {
    data: { date: string; count: number }[];
  };
  transactions: Transaction[];
  alerts: {
    failedPayments: number;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  description: string;
}

export interface AnalyticsEvent {
  id: string;
  eventType: 'login' | 'item_created' | 'item_updated' | 'item_deleted' | 'receipt_scanned' | 'barcode_scanned';
  userId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StripeEvent {
  id: string;
  eventType: string;
  eventId: string; // Stripe event ID
  createdAt: string;
  data: Record<string, any>;
}
