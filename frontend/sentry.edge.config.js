// Sentry edge runtime configuration
import * as Sentry from "@sentry/nextjs";

export function init() {
  Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  // Only capture errors in production
  beforeSend(event, hint) {
    // Only send errors in production
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    return event;
  },
  });
}
