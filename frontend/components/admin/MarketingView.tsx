import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Mail, AlertCircle, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import type { Period } from '../../types/admin';
import { getEmailMetrics, type EmailMetrics } from '../../services/adminService';
import { FunnelTiles } from './FunnelTiles';
import { AnalyticsLinksCard } from './AnalyticsLinksCard';

interface MarketingViewProps {
  period: Period;
  onPeriodChange?: (period: Period) => void;
}

export const MarketingView: React.FC<MarketingViewProps> = ({
  period,
  onPeriodChange,
}) => {
  const [data, setData] = useState<EmailMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getEmailMetrics(period);
      setData(res);
    } catch (err) {
      console.error('Failed to load email metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load email marketing metrics');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="p-6 space-y-6" data-testid="marketing-view">
      {/* Header with Period Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing & Email Health</h1>
          <p className="text-slate-500">Transactional and marketing email delivery visibility</p>
        </div>
        {onPeriodChange && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === p
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Config Chip */}
      {data?.config && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-4 text-xs font-medium" data-testid="email-config-chip">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Resend</span>
            {data.config.resend_configured ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Unconfigured
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">From</span>
            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
              {data.config.from_address || 'None'}
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Webhook</span>
            {data.config.webhook_secret_present ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                <HelpCircle className="w-3.5 h-3.5" /> Absent
              </span>
            )}
          </div>
        </div>
      )}

      {/* Funnel Tiles */}
      <FunnelTiles period={period} />

      <AnalyticsLinksCard />

      {/* Loading / Error States */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="font-medium text-sm">Loading email visibility data...</span>
        </div>
      ) : error || !data ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <span className="text-sm font-medium">{error || 'No email metrics data available'}</span>
          </div>
          <button
            onClick={() => void fetchMetrics()}
            className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Email Stats Row: Sends, Failures, Delivery Rate, Bounce Rate, Complaint Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Non-Backfill Sends in Period */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sent ({period})</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {Object.entries(data.status_counts)
                    .reduce((acc, [st, cnt]) => acc + (st !== 'backfill' ? cnt : 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-1">Excludes backfill rows</span>
            </div>

            {/* Failures in Period */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failures ({period})</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-600">
                  {(data.status_counts['failed'] ?? 0).toLocaleString()}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-1">Failed delivery attempts</span>
            </div>

            {/* Delivery Rate */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivery Rate</span>
              <div className="mt-2">
                {data.rates ? (
                  <span className="text-2xl font-bold text-emerald-600">
                    {(data.rates.delivered * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> Pending webhook
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 mt-1">
                {data.rates ? `${(data.rates.delivered * data.rates.total_sent).toFixed(0)} delivered` : 'Awaiting Resend events'}
              </span>
            </div>

            {/* Bounce Rate */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bounce Rate</span>
              <div className="mt-2">
                {data.rates ? (
                  <span className="text-2xl font-bold text-amber-600">
                    {(data.rates.bounced * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> Pending webhook
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 mt-1">
                {data.rates ? `${(data.rates.bounced * data.rates.total_sent).toFixed(0)} bounced` : 'Awaiting Resend events'}
              </span>
            </div>

            {/* Complaint Rate */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Complaint Rate</span>
              <div className="mt-2">
                {data.rates ? (
                  <span className="text-2xl font-bold text-rose-600">
                    {(data.rates.complained * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> Pending webhook
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 mt-1">
                {data.rates ? `${(data.rates.complained * data.rates.total_sent).toFixed(0)} spam reports` : 'Awaiting Resend events'}
              </span>
            </div>
          </div>

          {/* Volume by Template and Volume by Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sends by Template */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Volume by Template ({period})</h2>
              {data.sends_by_template.length === 0 ? (
                <div className="text-slate-400 text-sm py-6 text-center">No emails sent in this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-2.5">Template</th>
                        <th className="py-2.5 text-right">Sends</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.sends_by_template.map((t) => (
                        <tr key={t.template} className="hover:bg-slate-50">
                          <td className="py-2.5 font-medium text-slate-800 font-mono text-xs">{t.template}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-700">{t.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sends by Day */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Volume by Day ({period})</h2>
              {data.sends_by_day.length === 0 ? (
                <div className="text-slate-400 text-sm py-6 text-center">No sends recorded for this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-2.5">Day</th>
                        <th className="py-2.5 text-right">Sends</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.sends_by_day.map((d) => (
                        <tr key={d.day} className="hover:bg-slate-50">
                          <td className="py-2.5 text-slate-600 font-mono text-xs">{d.day}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-700">{d.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Failures & Suppressions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Failures */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Recent Failures</h2>
                <span className="text-xs text-slate-500 font-medium">Latest {data.recent_failures.length}</span>
              </div>
              {data.recent_failures.length === 0 ? (
                <div className="text-slate-400 text-sm py-6 text-center">No recent failures 🎉</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-2.5">Time</th>
                        <th className="py-2.5">Recipient</th>
                        <th className="py-2.5">Template</th>
                        <th className="py-2.5">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {data.recent_failures.map((f, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 text-slate-500 whitespace-nowrap">
                            {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 font-mono text-slate-700">{f.to_email}</td>
                          <td className="py-2 font-mono text-slate-600">{f.template}</td>
                          <td className="py-2 text-rose-600 max-w-xs truncate" title={f.error_message}>
                            {f.error_message || 'Unknown failure'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Suppressions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Email Suppressions</h2>
                <span className="text-xs font-medium text-slate-500">Total: {data.suppressions.count}</span>
              </div>
              {data.suppressions.items.length === 0 ? (
                <div className="text-slate-400 text-sm py-6 text-center">No suppressed addresses</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-2.5">Email</th>
                        <th className="py-2.5">Reason</th>
                        <th className="py-2.5 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {data.suppressions.items.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 font-mono text-slate-700">{s.email}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 capitalize">
                              {s.reason}
                            </span>
                          </td>
                          <td className="py-2 text-right text-slate-500 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sends Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Recent Sends</h2>
              <span className="text-xs text-slate-500 font-medium">Showing up to 50 latest non-backfill sends</span>
            </div>
            {data.recent_sends.length === 0 ? (
              <div className="text-slate-400 text-sm py-6 text-center">No recent sends found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                      <th className="py-3 px-2">Time</th>
                      <th className="py-3 px-2">Recipient</th>
                      <th className="py-3 px-2">Template</th>
                      <th className="py-3 px-2">Subject</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 font-mono">Resend ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data.recent_sends.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                          {new Date(s.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-800">{s.to_email}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-600">{s.template}</td>
                        <td className="py-2.5 px-2 text-slate-700 max-w-xs truncate" title={s.subject}>
                          {s.subject || '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              s.status === 'delivered'
                                ? 'bg-emerald-50 text-emerald-700'
                                : s.status === 'failed' || s.status === 'bounced' || s.status === 'complained'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-400 text-xs">
                          {s.resend_id ? s.resend_id.slice(0, 16) + '...' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
