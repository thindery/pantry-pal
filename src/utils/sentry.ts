/**
 * Sentry Integration for Pantry-Pal Frontend
 * 
 * Usage: Import and call initSentry() in main.tsx before ReactDOM.render
 */

import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (dsn == null || import.meta.env.DEV) {
    console.log('[Sentry] Skipping initialization (no DSN or dev mode)');
    return;
  }
  
  Sentry.init({
    dsn: dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Customize replay options
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Session Replay
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE ?? '0.01'),
    replaysOnErrorSampleRate: 1.0, // Always replay on errors
    // Environment
    environment: import.meta.env.VITE_ENVIRONMENT ?? 'production',
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
    // Before sending, sanitize sensitive data
    beforeSend(event) {
      // Remove sensitive data from console breadcrumbs
      if (event.breadcrumbs != null) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.category === 'console' && crumb.message) {
            // Redact potential API keys or tokens
            crumb.message = crumb.message.replace(
              /(sk_live_|pk_live_|Bearer\s+)[a-zA-Z0-9_]+/g,
              '[REDACTED]'
            );
          }
          return crumb;
        });
      }
      
      return event;
    },
  });
  
  console.log('[Sentry] Initialized for environment:', import.meta.env.VITE_ENVIRONMENT);
}

export { Sentry };
