import React, { useState, useMemo } from 'react';
import { Activity, ActivityType } from '../types';

type TimeFilter = 'all' | '7d' | '30d' | '90d';

const typeConfig: Record<ActivityType, { 
  icon: string; 
  label: string; 
  bg: string; 
  border: string;
  text: string;
  badgeBg: string;
}> = {
  ADD: {
    icon: '📥',
    label: 'Added',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-600',
    badgeBg: 'bg-emerald-100',
  },
  REMOVE: {
    icon: '📤',
    label: 'Removed',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    text: 'text-rose-600',
    badgeBg: 'bg-rose-100',
  },
  ADJUST: {
    icon: '⚖️',
    label: 'Adjusted',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-600',
    badgeBg: 'bg-amber-100',
  },
};

const sourceIcons: Record<string, string> = {
  MANUAL: '👤',
  RECEIPT_SCAN: '📷',
  VISUAL_USAGE: '📸',
};

const formatRelativeDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

interface ActivityLedgerProps {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const ActivityLedger: React.FC<ActivityLedgerProps> = ({
  activities,
  isLoading,
  error,
  onRetry,
}) => {
  const [filter, setFilter] = useState<TimeFilter>('all');

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    
    const now = new Date();
    const cutoff = new Date();
    const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
    cutoff.setDate(now.getDate() - days);
    
    return activities.filter(a => new Date(a.timestamp) >= cutoff);
  }, [activities, filter]);

  const stats = useMemo(() => {
    const added = filteredActivities
      .filter(a => a.type === 'ADD')
      .reduce((sum, a) => sum + a.amount, 0);
    const removed = filteredActivities
      .filter(a => a.type === 'REMOVE')
      .reduce((sum, a) => sum + a.amount, 0);
    
    // Find most active item
    const itemCounts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      itemCounts[a.itemName] = (itemCounts[a.itemName] || 0) + a.amount;
    });
    const mostActive = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    return { added, removed, net: added - removed, mostActive };
  }, [filteredActivities]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    filteredActivities.forEach(activity => {
      const date = formatRelativeDate(activity.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    });
    return groups;
  }, [filteredActivities]);

  const filters: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex justify-between items-center">
        <span>Error loading activities: {error}</span>
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Activity Ledger</h2>
          <p className="text-slate-500 text-sm mt-1">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
            {filter !== 'all' && ` in the last ${filter.replace('d', ' days')}`}
          </p>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-lg">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {filteredActivities.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-emerald-600">+{stats.added}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
              Items Added
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-rose-600">-{stats.removed}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
              Items Removed
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.net >= 0 ? '+' : ''}{stats.net}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
              Net Change
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-lg font-bold text-slate-700 truncate">
              {stats.mostActive?.[0] || '-'}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-1">
              Most Active
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
            <span className="text-3xl">📜</span>
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">No activities found</h3>
          <p className="text-slate-500 text-sm">
            {filter === 'all' 
              ? 'Start adding items to see your activity history' 
              : `No activities in the last ${filter.replace('d', ' days')}`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 py-3 sticky top-0 bg-slate-50/95 backdrop-blur z-10">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {date}
                </span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              
              {/* Activity Cards */}
              <div className="space-y-2">
                {items.map((activity, index) => {
                  const config = typeConfig[activity.type];
                  const sign = activity.type === 'ADD' ? '+' : 
                               activity.type === 'REMOVE' ? '-' : '±';
                  
                  return (
                    <div
                      key={activity.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 group"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon Circle */}
                        <div className={`w-12 h-12 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-xl">{config.icon}</span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800 truncate">
                              {activity.itemName}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full ${config.badgeBg} ${config.text} text-xs font-medium`}>
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <span>{sourceIcons[activity.source] || '•'}</span>
                            <span className="capitalize">
                              {activity.source.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(activity.timestamp).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        
                        {/* Amount */}
                        <div className="text-right">
                          <div className={`text-xl font-bold ${config.text}`}>
                            {sign}{activity.amount}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLedger;
