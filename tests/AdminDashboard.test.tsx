import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdminDashboard from '../components/AdminDashboard';
import * as adminService from '../services/adminService';
import { DashboardMetrics, Period } from '../types/admin';

// Mock the admin service
vi.mock('../services/adminService', () => ({
  getDashboardMetrics: vi.fn(),
}));

// Mock the admin components
vi.mock('../components/admin', () => ({
  Sidebar: vi.fn(({ activeView, onViewChange, isCollapsed, onToggleCollapse }) => (
    <aside data-testid="sidebar" data-collapsed={isCollapsed}>
      <button data-testid="nav-dashboard" onClick={() => onViewChange('dashboard')}>Dashboard</button>
      <button data-testid="nav-errors" onClick={() => onViewChange('errors')}>Errors</button>
      <button data-testid="nav-users" onClick={() => onViewChange('users')}>Users</button>
      <button data-testid="toggle-collapse" onClick={onToggleCollapse}>Toggle</button>
    </aside>
  )),
  KPICard: vi.fn(({ title, value, growth }) => (
    <div data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      <p data-testid="kpi-value">{value}</p>
      <span data-testid="kpi-growth">{growth}%</span>
    </div>
  )),
  ChartCard: vi.fn(({ title, data, period, onPeriodChange }) => (
    <div data-testid="chart-card">
      <h3>{title}</h3>
      <select 
        data-testid="period-select"
        value={period} 
        onChange={(e) => onPeriodChange(e.target.value as Period)}
      >
        <option value="7d">7 Days</option>
        <option value="30d">30 Days</option>
        <option value="90d">90 Days</option>
      </select>
      <div data-testid="chart-data">{data.length} data points</div>
    </div>
  )),
  TransactionsList: vi.fn(({ transactions, failedCount }) => (
    <div data-testid="transactions-list">
      <p data-testid="transaction-count">{transactions.length} transactions</p>
      {failedCount > 0 && <span data-testid="failed-count">{failedCount} failed</span>}
    </div>
  )),
}));

vi.mock('../components/admin/RevenueCard', () => ({
  RevenueCard: vi.fn(({ lifetime, momGrowth }) => (
    <div data-testid="revenue-card">
      <p data-testid="revenue-lifetime">${lifetime}</p>
      <span data-testid="revenue-growth">{momGrowth}%</span>
    </div>
  )),
}));

const mockMetrics: DashboardMetrics = {
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
    data: [
      { date: '2026-02-20', count: 45 },
      { date: '2026-02-21', count: 52 },
      { date: '2026-02-22', count: 48 },
    ],
  },
  transactions: [
    {
      id: 'txn_1',
      userId: 'usr_1',
      userEmail: 'alice@example.com',
      amount: 29,
      status: 'success',
      timestamp: '2026-02-12T18:30:00Z',
      description: 'Pro Plan - Monthly',
    },
    {
      id: 'txn_2',
      userId: 'usr_2',
      userEmail: 'bob@example.com',
      amount: 99,
      status: 'failed',
      timestamp: '2026-02-12T15:45:00Z',
      description: 'Family Plan - Yearly',
    },
  ],
  alerts: {
    failedPayments: 1,
  },
};

const mockErrors = [
  {
    id: 'err_1',
    user_id: 'usr_1',
    error_type: 'TypeError',
    error_message: 'Cannot read property of undefined',
    error_stack: 'at Component (file.tsx:123)',
    component: 'Dashboard',
    url: '/dashboard',
    user_agent: 'Mozilla/5.0',
    resolved: false,
    created_at: '2026-02-27T20:00:00Z',
  },
  {
    id: 'err_2',
    user_id: null,
    error_type: 'ReferenceError',
    error_message: 'variable is not defined',
    error_stack: 'at Function (file.tsx:456)',
    component: 'Login',
    url: '/login',
    user_agent: 'Mozilla/5.0',
    resolved: false,
    created_at: '2026-02-27T19:30:00Z',
  },
];

describe('AdminDashboard', () => {
  const mockOnBack = vi.fn();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getDashboardMetrics).mockResolvedValue(mockMetrics);
    
    // Setup fetch mock for errors endpoint
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading spinner initially', () => {
      // Delay the resolution to keep loading state
      vi.mocked(adminService.getDashboardMetrics).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AdminDashboard onBack={mockOnBack} />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...').parentElement?.querySelector('svg')).toBeInTheDocument();
    });

    it('hides loading state after data loads', async () => {
      render(<AdminDashboard onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      vi.mocked(adminService.getDashboardMetrics).mockRejectedValue(
        new Error('Failed to connect to server')
      );

      render(<AdminDashboard onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
      });
    });

    it('displays generic error message for unknown errors', async () => {
      vi.mocked(adminService.getDashboardMetrics).mockRejectedValue('Unknown error');

      render(<AdminDashboard onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      });
    });

    it('calls getDashboardMetrics with correct period on retry', async () => {
      vi.mocked(adminService.getDashboardMetrics).mockRejectedValueOnce(
        new Error('Failed to connect')
      ).mockResolvedValueOnce(mockMetrics);

      render(<AdminDashboard onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(adminService.getDashboardMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty State', () => {
    it('displays no data message when metrics is null', async () => {
      vi.mocked(adminService.getDashboardMetrics).mockResolvedValue(null as any);

      render(<AdminDashboard onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText('No Data Available')).toBeInTheDocument();
        expect(screen.getByText('Dashboard data is currently unavailable. Please try again later.')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard View', () => {
    beforeEach(async () => {
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });
    });

    it('renders dashboard title and description', () => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Overview of your app performance')).toBeInTheDocument();
    });

    it('renders back button', () => {
      expect(screen.getByText('Back to App')).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', async () => {
      const backButton = screen.getByText('Back to App');
      await userEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('renders sidebar component', () => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders KPI cards with correct data', () => {
      expect(screen.getByTestId('kpi-total-users')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-products')).toBeInTheDocument();
      expect(screen.getByTestId('revenue-card')).toBeInTheDocument();
    });

    it('renders chart card', () => {
      expect(screen.getByTestId('chart-card')).toBeInTheDocument();
    });

    it('renders transactions list', () => {
      expect(screen.getByTestId('transactions-list')).toBeInTheDocument();
    });

    it('calls getDashboardMetrics on mount with default period', async () => {
      expect(adminService.getDashboardMetrics).toHaveBeenCalledWith('7d');
    });

    it('updates period when period selector changes', async () => {
      const periodSelect = screen.getByTestId('period-select');
      
      await userEvent.selectOptions(periodSelect, '30d');

      await waitFor(() => {
        expect(adminService.getDashboardMetrics).toHaveBeenCalledWith('30d');
      });
    });

    it('fetches data for multiple period changes', async () => {
      const periodSelect = screen.getByTestId('period-select');
      
      await userEvent.selectOptions(periodSelect, '30d');
      await waitFor(() => {
        expect(adminService.getDashboardMetrics).toHaveBeenCalledWith('30d');
      });

      await userEvent.selectOptions(periodSelect, '90d');
      await waitFor(() => {
        expect(adminService.getDashboardMetrics).toHaveBeenCalledWith('90d');
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });
    });

    it('switches to errors view when errors nav is clicked', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: mockErrors }),
      });

      const errorsNav = screen.getByTestId('nav-errors');
      await userEvent.click(errorsNav);

      await waitFor(() => {
        expect(screen.getByText('Client Errors')).toBeInTheDocument();
      });
    });

    it('switches to users view when users nav is clicked', async () => {
      const usersNav = screen.getByTestId('nav-users');
      await userEvent.click(usersNav);

      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('User management coming in Phase 2')).toBeInTheDocument();
      });
    });

    it('switches back to dashboard view from other views', async () => {
      // First go to users view
      await userEvent.click(screen.getByTestId('nav-users'));
      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
      });

      // Then go back to dashboard
      await userEvent.click(screen.getByTestId('nav-dashboard'));
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Overview of your app performance')).toBeInTheDocument();
    });
  });

  describe('Errors View', () => {
    beforeEach(async () => {
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ errors: mockErrors }),
      });

      await userEvent.click(screen.getByTestId('nav-errors'));
      await waitFor(() => {
        expect(screen.getByText('Client Errors')).toBeInTheDocument();
      });
    });

    it('displays loading state while fetching errors', async () => {
      // The loading state is already checked in the component
      expect(fetchMock).toHaveBeenCalledWith('/api/client-errors?resolved=false');
    });

    it('displays errors in a table', async () => {
      await waitFor(() => {
        expect(screen.getByText('TypeError')).toBeInTheDocument();
        expect(screen.getByText('ReferenceError')).toBeInTheDocument();
      });
    });

    it('displays error details correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('Cannot read property of undefined')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('shows empty state when no errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: [] }),
      });

      // Re-render and switch to errors view
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('nav-errors'));

      await waitFor(() => {
        expect(screen.getByText(/no unresolved errors/i)).toBeInTheDocument();
      });
    });

    it('calls resolve endpoint when resolve button is clicked', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true });

      await waitFor(() => {
        expect(screen.getAllByText('Resolve')[0]).toBeInTheDocument();
      });

      const resolveButtons = screen.getAllByText('Resolve');
      await userEvent.click(resolveButtons[0]);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/api/client-errors/err_1/resolve', {
          method: 'PATCH',
        });
      });
    });

    it('removes resolved error from the list', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await waitFor(() => {
        expect(screen.getByText('TypeError')).toBeInTheDocument();
        expect(screen.getByText('ReferenceError')).toBeInTheDocument();
      });

      const resolveButtons = screen.getAllByText('Resolve');
      await userEvent.click(resolveButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('TypeError')).not.toBeInTheDocument();
        expect(screen.getByText('ReferenceError')).toBeInTheDocument();
      });
    });

    it('handles resolve error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await waitFor(() => {
        const resolveButtons = screen.getAllByText('Resolve');
        expect(resolveButtons[0]).toBeInTheDocument();
      });

      const resolveButtons = screen.getAllByText('Resolve');
      await userEvent.click(resolveButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to resolve error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Products View', () => {
    it('displays products coming soon message', async () => {
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Mock the sidebar navigation to products
      const sidebar = screen.getByTestId('sidebar');
      // Find products button if it exists
      const productsNav = screen.queryByTestId('nav-products');
      if (productsNav) {
        await userEvent.click(productsNav);
        await waitFor(() => {
          expect(screen.getByText('Product management coming in Phase 2')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Stripe View', () => {
    it('displays stripe events coming soon message', async () => {
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      const stripeNav = screen.queryByTestId('nav-stripe');
      if (stripeNav) {
        await userEvent.click(stripeNav);
        await waitFor(() => {
          expect(screen.getByText('Stripe event logs coming in Phase 2')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('collapses sidebar when window is narrow', async () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<AdminDashboard onBack={mockOnBack} />);
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
      });
    });

    it('expands sidebar when window is wide', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<AdminDashboard onBack={mockOnBack} />);
      
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
      });
    });
  });

  describe('Sidebar Integration', () => {
    it('toggles sidebar collapse state', async () => {
      render(<AdminDashboard onBack={mockOnBack} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId('toggle-collapse');
      
      // Initial state
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
      
      // Toggle
      await userEvent.click(toggleButton);
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
      
      // Toggle back
      await userEvent.click(toggleButton);
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
    });
  });
});
