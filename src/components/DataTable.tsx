// TASK-010: Table real data fix - use live data instead of mock
import React, { useEffect, useState } from 'react';
import type { Activity } from '../types';

interface DataTableProps {
  fetchUrl?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ fetchUrl = '/api/activities' }) => {
  const [data, setData] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Activity>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadRealData();
  }, [fetchUrl]);

  const loadRealData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // BUG FIX: Use real data API instead of mock data
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      // Handle both direct array and wrapped response formats
      const activities = Array.isArray(result) ? result : result.data || result.activities || [];
      
      setData(activities);
    } catch (err) {
      console.error('Failed to load table data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortOrder === 'asc' ? 1 : -1;
    
    if (aVal < bVal) return -1 * modifier;
    if (aVal > bVal) return 1 * modifier;
    return 0;
  });

  const handleSort = (field: keyof Activity) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</button>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th onClick={() => handleSort('name')}>Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
          <th onClick={() => handleSort('status')}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
          <th onClick={() => handleSort('timestamp')}>Date {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedData.length === 0 ? (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No data available</td>
          </tr>
        ) : (
          sortedData.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.status}</td>
              <td>{new Date(item.timestamp).toLocaleString()}</td>
              <td><button>Edit</button></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
