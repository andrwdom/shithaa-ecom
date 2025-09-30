// Next.js instrumentation file for Sentry
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const { init } = await import('./sentry.server.config.js');
    init();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    const { init } = await import('./sentry.edge.config.js');
    init();
  }
}

// Add onRequestError hook for better error tracking
export async function onRequestError(err: unknown, request: {
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
}) {
  // Use Sentry.captureRequestError to instrument the onRequestError hook
  Sentry.captureRequestError(err, request);
}

// Client-side initialization
if (typeof window !== 'undefined') {
  import('./instrumentation-client.ts').then(({ init }) => init());
}
