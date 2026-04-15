import { useEffect, useState } from 'react';
import * as React from 'react';

// TASK-043/007: Activity dashboard with null safety fixes
export const ActivityDashboard: React.FC = () => {
  const [stats, setStats] = useState(() => ({ total: 0, active: 0, completed: 0 }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/activities/stats');
        const data = await response.json();
        
        setStats({
          total: data?.total ?? 0,
          active: data?.active ?? 0,
          completed: data?.completed ?? 0
        });
      } catch (_err) {
        console.error('Failed to load stats:', _err);
        setStats({ total: 0, active: 0, completed: 0 });
        setError('Unable to load statistics');
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h2>Activity Dashboard</h2>
      {error && <div className="error">{error}</div>}
      <div className="stats">
        <div>Total: {stats.total}</div>
        <div>Active: {stats.active}</div>
        <div>Completed: {stats.completed}</div>
      </div>
    </div>
  );
};

// localStorage persistence helper
export const STORAGE_KEY = 'activity_dashboard_state';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadStoredState = (defaultValue: any): any => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveState = (state: any): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('localStorage not available');
  }
};
