// Next.js instrumentation file for Sentry
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

// Client-side initialization
if (typeof window !== 'undefined') {
  import('./sentry.client.config.js').then(({ init }) => init());
}
