import React, { useState, useEffect } from 'react';
import { ShoppingSession, ShoppingSessionItem } from '../types';
import { getShoppingSessions } from '../services/apiService';

interface SessionHistoryProps {
  onBack: () => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ onBack }) => {
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<ShoppingSession | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const loadSessions = async (pageNum: number = 1, status?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { page: number; limit: number; status?: string } = {
        page: pageNum,
        limit: 10,
      };
      if (status && status !== 'all') {
        params.status = status;
      }
      const response = await getShoppingSessions(params);
      if (response.success && response.data) {
        setSessions(response.data);
        setTotalPages(response.meta?.totalPages || 1);
      } else {
        setError('Failed to load sessions');
      }
    } catch (err) {
      setError('Failed to load session history');
      console.error('Load sessions error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(1, filter === 'all' ? undefined : filter);
  }, [filter]);

  const handleFilterChange = (newFilter: 'all' | 'completed' | 'cancelled') => {
    setFilter(newFilter);
    setPage(1);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Session Detail View
  if (selectedSession) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedSession(null)}
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
          >
            ← Back to History
          </button>
        </div>

        {/* Session Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                selectedSession.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : selectedSession.status === 'cancelled'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {selectedSession.status === 'completed' ? '✓' : selectedSession.status === 'cancelled' ? '✕' : '●'}
              {selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
            </span>
            <span className="text-sm text-slate-500">
              {new Date(selectedSession.startedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-sm">Items</p>
              <p className="text-2xl font-bold text-slate-800">{selectedSession.itemCount}</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm">Total</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(selectedSession.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Image */}
        {selectedSession.receiptUrl && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700 mb-3">Receipt</p>
            <img
              src={selectedSession.receiptUrl}
              alt="Receipt"
              className="w-full h-64 object-contain bg-slate-50 rounded-xl"
            />
          </div>
        )}

        {/* Notes */}
        {selectedSession.notes && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-1">📝 Notes</p>
            <p className="text-amber-700">{selectedSession.notes}</p>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800">Items</h3>
          <div className="space-y-2">
            {selectedSession.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full uppercase">
                      {item.category || 'other'}
                    </span>
                    {item.barcode && (
                      <span className="font-mono">{item.barcode.slice(-6)}</span>
                    )}
                  </div>
                </div>
                {item.price !== undefined && item.price !== null && (
                  <div className="text-right">
                    <p className="font-bold text-slate-700">{formatCurrency(item.price)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Session History</h2>
        <p className="text-slate-500">View your past shopping sessions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          ⚠️ {error}
          <button
            onClick={() => loadSessions(page, filter === 'all' ? undefined : filter)}
            className="ml-2 text-rose-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-500">Loading sessions...</p>
        </div>
      ) : sessions?.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <span className="text-4xl mb-3 block">📋</span>
          <p className="text-slate-500 font-medium">No sessions found</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'all'
              ? 'Start a shopping session to see it here'
              : `No ${filter} sessions yet`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions || []).map((session) => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className="w-full bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">{formatDate(session.startedAt)}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {session.status === 'completed' ? '✓' : '✕'}
                  {session.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Items</p>
                    <p className="font-bold text-slate-800">{session.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(session.totalAmount)}
                    </p>
                  </div>
                </div>

                {session.receiptUrl && (
                  <span className="text-xl" title="Has receipt">📷</span>
                )}
              </div>

              {session.notes && (
                <p className="text-sm text-slate-500 mt-2 truncate">📝 {session.notes}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && sessions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => {
              const newPage = page - 1;
              setPage(newPage);
              loadSessions(newPage, filter === 'all' ? undefined : filter);
            }}
            disabled={page <= 1}
            className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => {
              const newPage = page + 1;
              setPage(newPage);
              loadSessions(newPage, filter === 'all' ? undefined : filter);
            }}
            disabled={page >= totalPages}
            className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
