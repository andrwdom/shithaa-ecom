// Lightweight idempotency helper. In this codebase we rely primarily on
// database unique indexes (e.g., unique transaction IDs, unique checkoutSessionId)
// for true protection. This wrapper exists to provide a consistent callsite API
// for critical operations while keeping behavior non-destructive.

export const withIdempotency = async (key, work, { Model } = {}) => {
  // If a Model is provided and has a natural unique field corresponding to key,
  // the caller should still ensure proper upserts/guards. We simply execute
  // the work here to avoid invasive refactors.
  return work();
};

export default { withIdempotency };


