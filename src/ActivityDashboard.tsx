import { useEffect, useState } from 'react';
import { getActivities } from '../services/activityApi';
import type { Activity } from '../types';

export const ActivityDashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
    loadStats();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await getActivities();
      setActivities(data);
    } catch (err) {
      setError('Failed to load activities');
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/activities/stats');
      const data = await response.json();
      // TASK-043: Activity dashboard with null safety
      setStats({
        total: data?.total ?? 0,
        active: data?.active ?? 0,
        completed: data?.completed ?? 0
      });
    } catch (err) {
      setStats({ total: 0, active: 0, completed: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="activity-dashboard">
      <h2>Activity Dashboard</h2>
      <div className="stats">
        <div>Total: {stats.total}</div>
        <div>Active: {stats.active}</div>
        <div>Completed: {stats.completed}</div>
      </div>
      <ul>
        {activities.map(a => (
          <li key={a.id}>{a.name} ({a.status})</li>
        ))}
      </ul>
    </div>
  );
};
