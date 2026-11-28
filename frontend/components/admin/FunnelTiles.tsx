import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Period } from '../../types/admin';
import { getFunnelMetrics, type FunnelMetrics } from '../../services/adminService';
import { KPICard } from './KPICard';

interface FunnelTilesProps {
  period: Period;
  data?: FunnelMetrics | null;
}

export const FunnelTiles: React.FC<FunnelTilesProps> = ({ period, data: propData }) => {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(propData ?? null);
  const [isLoading, setIsLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (propData) {
      setMetrics(propData);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFunnelMetrics(period);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load funnel metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription funnel metrics');
    } finally {
      setIsLoading(false);
    }
  }, [period, propData]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Subscription funnel</h2>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{period} window</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading subscription funnel...</span>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Subscription funnel</h2>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{period} window</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error || 'No funnel data available'}</span>
          </div>
          <button
            onClick={() => void fetchMetrics()}
            className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const signupsPeriod = metrics.signups?.period ?? metrics.signupsPeriod ?? 0;
  const signupsAllTime = metrics.signups?.allTime ?? metrics.signupsAllTime ?? 0;
  const signupsPreTracking = metrics.signups?.preTracking ?? 0;

  const trialsPeriod = metrics.trials?.period ?? metrics.trialsPeriod ?? 0;
  const trialsAllTime = metrics.trials?.allTime ?? metrics.trialsAllTime ?? 0;

  const proPeriod = metrics.paidConversions?.pro?.period ?? metrics.proConversions ?? 0;
  const proAllTime = metrics.paidConversions?.pro?.allTime ?? metrics.proConversionsAllTime ?? 0;

  const familyPeriod = metrics.paidConversions?.family?.period ?? metrics.familyConversions ?? 0;
  const familyAllTime = metrics.paidConversions?.family?.allTime ?? metrics.familyConversionsAllTime ?? 0;

  const churnedPeriod = metrics.churned?.period ?? metrics.churnedPeriod ?? 0;
  const churnedAllTime = metrics.churned?.allTime ?? metrics.churnedAllTime ?? 0;

  const cancelSchedPeriod = metrics.cancelScheduled?.period ?? metrics.cancelScheduledPeriod ?? 0;
  const cancelSchedAllTime = metrics.cancelScheduled?.allTime ?? metrics.cancelScheduledAllTime ?? 0;

  return (
    <div className="space-y-3" data-testid="subscription-funnel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Subscription funnel</h2>
          <p className="text-xs text-slate-500">First-party signup and subscription conversions</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">
          {period} window
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Signups"
          value={signupsPeriod.toLocaleString()}
          secondaryText={`All-time: ${signupsAllTime.toLocaleString()}${
            signupsPreTracking > 0 ? ` (${signupsPreTracking} from before signup dates were recorded)` : ""
          }`}
          color="blue"
        />
        <KPICard
          title="Trials"
          value={trialsPeriod.toLocaleString()}
          secondaryText={`All-time: ${trialsAllTime.toLocaleString()}`}
          color="amber"
        />
        <KPICard
          title="Pro conversions"
          value={proPeriod.toLocaleString()}
          secondaryText={`All-time: ${proAllTime.toLocaleString()}`}
          color="emerald"
        />
        <KPICard
          title="Family conversions"
          value={familyPeriod.toLocaleString()}
          secondaryText={`All-time: ${familyAllTime.toLocaleString()}`}
          color="emerald"
        />
        <KPICard
          title="Churned"
          value={churnedPeriod.toLocaleString()}
          secondaryText={`All-time: ${churnedAllTime.toLocaleString()}`}
          color="rose"
        />
        <KPICard
          title="Cancel scheduled"
          value={cancelSchedPeriod.toLocaleString()}
          secondaryText={`All-time: ${cancelSchedAllTime.toLocaleString()}`}
          color="amber"
          badge={
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
              In term
            </span>
          }
        />
      </div>
    </div>
  );
};

export default FunnelTiles;
