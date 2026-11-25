import React from 'react';
import { ExternalLink, CircleDashed } from 'lucide-react';

/**
 * PP-127: outbound links to the analytics / webmaster tools set up in
 * PP-117–PP-122. Links only: no traffic numbers, no API keys, no tags.
 * Update `status` here when a tool's ticket closes.
 */
export interface AnalyticsTool {
  id: string;
  name: string;
  ticket: string;
  status: 'live' | 'not_set_up';
  href?: string;
  note?: string;
}

export const ANALYTICS_TOOLS: AnalyticsTool[] = [
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    ticket: 'PP-117',
    status: 'live',
    href: 'https://analytics.google.com/analytics/web/',
    note: 'Consent-gated tag. Pick the Pantry Hub property after sign-in.',
  },
  {
    id: 'gsc',
    name: 'Google Search Console',
    ticket: 'PP-118',
    status: 'live',
    href: 'https://search.google.com/search-console?resource_id=sc-domain%3Amypantryhub.com',
    note: 'Domain property mypantryhub.com.',
  },
  {
    id: 'bing',
    name: 'Bing Webmaster Tools',
    ticket: 'PP-119',
    status: 'not_set_up',
    note: 'Import from Search Console needs Tylor’s Microsoft sign-in.',
  },
  {
    id: 'cf',
    name: 'Cloudflare Web Analytics',
    ticket: 'PP-120',
    status: 'live',
    href: 'https://dash.cloudflare.com/?to=/:account/web-analytics',
    note: 'Cookieless beacon on www.mypantryhub.com.',
  },
];

export const AnalyticsLinksCard: React.FC<{ tools?: AnalyticsTool[] }> = ({ tools = ANALYTICS_TOOLS }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6" data-testid="analytics-links">
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <h3 className="text-lg font-semibold text-slate-900">Analytics tools</h3>
      <p className="text-xs text-slate-500">Links only. In-app charts wait on read-only keys (PP-121).</p>
    </div>
    <ul className="divide-y divide-slate-100">
      {tools.map((tool) => (
        <li key={tool.id} className="py-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{tool.name}</p>
            {tool.note && <p className="text-xs text-slate-500 mt-0.5">{tool.note}</p>}
          </div>
          {tool.status === 'live' && tool.href ? (
            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
            >
              Open
              <ExternalLink className="w-4 h-4" aria-hidden />
              <span className="sr-only">{tool.name} (opens in a new tab)</span>
            </a>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-sm text-slate-500" data-testid={`analytics-not-set-up-${tool.id}`}>
              <CircleDashed className="w-4 h-4" aria-hidden />
              Not set up — see {tool.ticket}
            </span>
          )}
        </li>
      ))}
    </ul>
  </div>
);
