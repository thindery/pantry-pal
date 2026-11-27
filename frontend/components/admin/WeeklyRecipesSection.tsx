import React, { useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import {
  approveWeeklyIssue,
  skipWeeklyIssue,
  type EmailMarketing,
  type WeeklyIssue,
  type WeeklyRecipes,
} from '../../services/adminService';

const STATUS: Record<WeeklyIssue['status'], { text: string; cls: string }> = {
  draft: { text: 'Draft: waiting for approval', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { text: 'Approved: waiting to send', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  sending: { text: 'Sending', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  sent: { text: 'Sent', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  skipped: { text: 'Skipped', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const pct = (v: number | null) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : null);

interface Props {
  weekly: WeeklyRecipes;
  mode: EmailMarketing['config']['journeys_mode'];
  openTrackingSeen: boolean;
  onChanged: () => void;
}

export const WeeklyRecipesSection: React.FC<Props> = ({ weekly, mode, openTrackingSeen, onChanged }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (issue: WeeklyIssue, kind: 'approve' | 'skip') => {
    if (busy) return;
    if (kind === 'approve') {
      const who = `${weekly.audience.total} ${weekly.audience.total === 1 ? 'person' : 'people'}`;
      const note = mode === 'on' ? '' : ' Email is not live yet, so it will wait until it is switched on.';
      if (!window.confirm(`Send "${issue.subject}" to ${who}?${note}`)) return;
    }
    setBusy(`${kind}:${issue.id}`);
    setError(null);
    try {
      if (kind === 'approve') await approveWeeklyIssue(issue.id);
      else await skipWeeklyIssue(issue.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Reload and check the issue status.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4" data-testid="weekly-recipes">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-600" /> Weekly recipe email
        </h2>
        <span className="text-xs text-slate-500" data-testid="weekly-audience">
          Goes to {weekly.audience.total} {weekly.audience.total === 1 ? 'address' : 'addresses'} now:{' '}
          {weekly.audience.subscribers} recipe subscribers, {weekly.audience.app_users} app users who opted in
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
        <span
          className={`px-2.5 py-1 rounded-md border ${weekly.auto_send ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white text-slate-600 border-slate-200'}`}
          data-testid="weekly-auto-send"
        >
          {weekly.auto_send
            ? `Auto-send ON: approves itself ${weekly.auto_send_delay_hours} hours after the test copy unless skipped`
            : 'Auto-send OFF: nothing goes out until you approve'}
        </span>
        <span className="px-2.5 py-1 rounded-md border bg-white text-slate-600 border-slate-200">
          Test copy address {weekly.test_recipient_set ? 'set' : 'not set'}
        </span>
        {mode !== 'on' && (
          <span className="px-2.5 py-1 rounded-md border bg-slate-100 text-slate-700 border-slate-200">Email is not live: approving only queues it</span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600" role="alert">{error}</p>}

      {weekly.issues.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500" data-testid="weekly-empty">
          No weekly issue yet. The next one is built Wednesday morning and a test copy is emailed to you first.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {weekly.issues.map((i) => {
            const st = STATUS[i.status];
            const started = i.status === 'sending' || i.status === 'sent';
            return (
              <div key={i.id} className="border border-slate-200 rounded-xl p-3" data-testid={`weekly-issue-${i.issue_key}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{i.issue_key}</p>
                    <p className="text-sm font-semibold text-slate-900">{i.subject}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${st.cls}`} data-testid={`weekly-status-${i.issue_key}`}>{st.text}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {i.recipes.map((r) => r.title).join(' · ')}
                  {i.tip_title ? ` · Tip: ${i.tip_title}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {i.test_sent_at ? `Test copy sent ${when(i.test_sent_at)}` : 'Test copy not sent'}
                  {i.approved_at ? ` · Approved ${when(i.approved_at)}${i.approved_by === 'auto' ? ' (auto-send)' : ''}` : ''}
                  {i.send_completed_at ? ` · Finished ${when(i.send_completed_at)}` : ''}
                </p>
                {started && (
                  <table className="mt-2 w-full text-xs" data-testid={`weekly-stats-${i.issue_key}`}>
                    <thead>
                      <tr className="text-left text-slate-400 uppercase tracking-wider">
                        <th className="py-1 pr-3 font-semibold text-right">Sent</th>
                        <th className="py-1 pr-3 font-semibold text-right">Delivered</th>
                        <th className="py-1 pr-3 font-semibold text-right">Opened</th>
                        <th className="py-1 pr-3 font-semibold text-right">Clicked</th>
                        <th className="py-1 pr-3 font-semibold text-right">Click rate</th>
                        <th className="py-1 font-semibold text-right">Bounced</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="py-1.5 pr-3 text-right">{i.stats.sent}</td>
                        <td className="py-1.5 pr-3 text-right">{i.stats.delivered}</td>
                        <td className="py-1.5 pr-3 text-right">
                          {openTrackingSeen ? `${i.stats.opened} (${pct(i.stats.open_rate)})` : 'n/a'}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{i.stats.clicked}</td>
                        <td className="py-1.5 pr-3 text-right">{pct(i.stats.click_rate)}</td>
                        <td className="py-1.5 text-right">{i.stats.bounced}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
                {(i.can_approve || i.can_skip) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {i.can_approve && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void act(i, 'approve')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy === `approve:${i.id}` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Approve &amp; send
                      </button>
                    )}
                    {i.can_skip && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void act(i, 'skip')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        Skip this week
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">Counts are real rows. The [TEST] copy to you is not counted.</p>
    </div>
  );
};
