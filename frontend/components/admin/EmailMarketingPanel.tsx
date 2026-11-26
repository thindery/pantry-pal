import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Mail, MousePointerClick, UserMinus, Users } from 'lucide-react';
import type { Period } from '../../types/admin';
import { getEmailMarketing, type EmailMarketing } from '../../services/adminService';

const MODE_LABEL: Record<EmailMarketing['config']['journeys_mode'], { text: string; cls: string }> = {
  off: { text: 'Journeys OFF: nothing is being sent', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  test: { text: 'TEST mode: only test addresses get mail', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  on: { text: 'LIVE: journeys are sending', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const pct = (v: number | null) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200" data-testid={testId}>
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}

function SubscribersChart({ days }: { days: EmailMarketing['subscribers']['by_day'] }) {
  if (days.length === 0) {
    return <p className="text-sm text-slate-500">No signups or unsubscribes in this period.</p>;
  }
  const max = Math.max(1, ...days.map((d) => Math.max(d.subscribed, d.unsubscribed, d.confirmed)));
  return (
    <div>
      <div className="flex items-end gap-1 h-28" role="img" aria-label="Signups per day">
        {days.map((d) => (
          <div key={d.day} className="flex-1 min-w-[6px] h-full flex flex-col justify-end gap-px" title={`${d.day}: ${d.subscribed} signed up, ${d.confirmed} confirmed, ${d.unsubscribed} unsubscribed`}>
            <div className="bg-emerald-500 rounded-t" style={{ height: `${(d.subscribed / max) * 100}%` }} />
            <div className="bg-sky-500" style={{ height: `${(d.confirmed / max) * 100}%` }} />
            <div className="bg-rose-400 rounded-b" style={{ height: `${(d.unsubscribed / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span><i className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1" />Signed up</span>
        <span><i className="inline-block w-2 h-2 bg-sky-500 rounded-sm mr-1" />Confirmed</span>
        <span><i className="inline-block w-2 h-2 bg-rose-400 rounded-sm mr-1" />Unsubscribed</span>
        <span className="ml-auto">{days[0].day} to {days[days.length - 1].day}</span>
      </div>
    </div>
  );
}

export const EmailMarketingPanel: React.FC<{ period: Period }> = ({ period }) => {
  const [data, setData] = useState<EmailMarketing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getEmailMarketing(period));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load email marketing data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-500" data-testid="email-marketing-loading">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Loading subscribers and journeys...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-3 text-rose-600" data-testid="email-marketing-error">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{error || 'No email marketing data'}</span>
        <button onClick={() => void load()} className="ml-auto text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">Retry</button>
      </div>
    );
  }

  const mode = MODE_LABEL[data.config.journeys_mode];
  const sub = data.subscribers;
  const pendingNote = data.config.journeys_mode !== 'on' && sub.pending > 0;
  const lifecycle = data.templates.filter((t) => t.category !== 'transactional');

  return (
    <section className="space-y-4" data-testid="email-marketing-panel" aria-label="Subscribers and journeys">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${mode.cls}`} data-testid="journeys-mode">{mode.text}</span>
        <span className="px-2.5 py-1 rounded-md border bg-white text-slate-600 border-slate-200">
          Webhook {data.config.webhook_secret_present ? 'secret set' : 'secret not set'}
        </span>
        <span className="px-2.5 py-1 rounded-md border bg-white text-slate-600 border-slate-200">
          Mailing address {data.config.mailing_address_set ? 'set' : 'not set'}
        </span>
        <span className="px-2.5 py-1 rounded-md border bg-white text-slate-600 border-slate-200">
          App-signup journey enrollment {data.config.onboarding_enrollment_on ? 'on' : 'off'}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat testId="stat-total" label="Recipe subscribers" value={sub.total.toLocaleString()} hint={`${sub.confirmed.toLocaleString()} confirmed`} />
        <Stat testId="stat-pending" label="Awaiting confirm" value={sub.pending.toLocaleString()} hint={pendingNote ? 'Held: journeys not live' : 'Double opt-in pending'} />
        <Stat testId="stat-new" label={`New (${period})`} value={sub.new_in_period.toLocaleString()} />
        <Stat testId="stat-unsub" label={`Unsubscribed (${period})`} value={sub.unsubscribed_in_period.toLocaleString()} hint={`${sub.unsubscribed.toLocaleString()} all time`} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> Subscribers over time</h2>
        <div className="mt-3"><SubscribersChart days={sub.by_day} /></div>
        {sub.by_source.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Sources: {sub.by_source.map((s) => `${s.source.replace('_', ' ')} ${s.count}`).join(' · ')}
            {sub.top_recipes.length > 0 ? ` · Top recipe pages: ${sub.top_recipes.map((r) => `${r.recipe_slug} ${r.count}`).join(', ')}` : ''}
          </p>
        )}
      </div>

      {data.journeys.map((j) => (
        <div key={j.journey} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4" data-testid={`journey-${j.journey}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-600" /> {j.journey.replace('_', ' ')} journey</h2>
            <span className="text-xs text-slate-500">
              {j.enrolled} enrolled · {j.active} active · {j.completed} done · {j.stopped} stopped
              {j.overdue > 0 ? ` · ${j.overdue} due now` : ''}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 uppercase tracking-wider">
                  <th className="py-1 pr-3 font-semibold">Step</th><th className="py-1 pr-3 font-semibold">Day</th>
                  <th className="py-1 pr-3 font-semibold text-right">Sent</th><th className="py-1 pr-3 font-semibold text-right">Delivered</th>
                  <th className="py-1 pr-3 font-semibold text-right">Opened</th><th className="py-1 pr-3 font-semibold text-right">Clicked</th>
                  <th className="py-1 font-semibold text-right">Click rate</th>
                </tr>
              </thead>
              <tbody>
                {j.steps.map((s) => (
                  <tr key={s.step} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-800 font-medium">{s.step.replace(/_/g, ' ')}</td>
                    <td className="py-1.5 pr-3 text-slate-500">{s.delay_days}</td>
                    <td className="py-1.5 pr-3 text-right">{s.sent}</td>
                    <td className="py-1.5 pr-3 text-right">{s.delivered}</td>
                    <td className="py-1.5 pr-3 text-right">{data.tracking.open_tracking_seen ? s.opened : 'n/a'}</td>
                    <td className="py-1.5 pr-3 text-right">{s.clicked}</td>
                    <td className="py-1.5 text-right">{pct(s.click_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(j.stop_reasons).length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Stopped: {Object.entries(j.stop_reasons).map(([r, n]) => `${r.replace(/_/g, ' ')} ${n}`).join(' · ')}</p>
          )}
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1"><UserMinus className="w-3.5 h-3.5" /> {j.unsubscribed_in_period} unsubscribed in {period}</p>
        </div>
      ))}

      {lifecycle.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4" data-testid="email-templates-table">
          <h2 className="text-sm font-bold text-slate-900">Every marketing and journey email ({period})</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 uppercase tracking-wider">
                <th className="py-1 pr-3 font-semibold">Email</th><th className="py-1 pr-3 font-semibold text-right">Sent</th>
                <th className="py-1 pr-3 font-semibold text-right">Clicked</th><th className="py-1 pr-3 font-semibold text-right">Bounced</th>
                <th className="py-1 font-semibold text-right">Complaints</th>
              </tr></thead>
              <tbody>
                {lifecycle.map((t) => (
                  <tr key={`${t.template}-${t.step}`} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-800">{t.template.replace(/_/g, ' ')}</td>
                    <td className="py-1.5 pr-3 text-right">{t.sent}</td><td className="py-1.5 pr-3 text-right">{t.clicked}</td>
                    <td className="py-1.5 pr-3 text-right">{t.bounced}</td><td className="py-1.5 text-right">{t.complained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4" data-testid="email-top-links">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MousePointerClick className="w-4 h-4 text-emerald-600" /> Most clicked links</h2>
        {data.top_links.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No link clicks yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-xs">
            {data.top_links.map((l) => (
              <li key={`${l.label}-${l.path}`} className="py-1.5 flex justify-between gap-3"><span className="truncate text-slate-700">{l.label} <span className="text-slate-400">{l.path}</span></span><span className="font-semibold">{l.unique_clicks}</span></li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Counted by our own link redirect. {data.bot_clicks_ignored} scanner-like clicks ignored. Opens need Resend open tracking{data.tracking.open_tracking_seen ? '' : ' (no open events seen yet)'}.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4" data-testid="email-recent-events">
        <h2 className="text-sm font-bold text-slate-900">Recent delivery events</h2>
        {data.recent_events.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {data.tracking.webhook_events_seen ? 'No events.' : 'No Resend webhook events yet. Add the webhook in Resend and set its secret on the server.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-xs">
            {data.recent_events.map((e, i) => (
              <li key={i} className="py-1.5 flex flex-wrap justify-between gap-2"><span className="font-medium text-slate-700">{e.event_type.replace('email.', '')}</span><span className="text-slate-500">{e.template ?? 'unknown'} · {e.to_email ?? ''}</span><span className="text-slate-400">{e.occurred_at ? new Date(e.occurred_at).toLocaleString() : ''}</span></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
