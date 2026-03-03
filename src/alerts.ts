import { notificationInternals } from './notifications';

export * from './notifications';

// Backward-compatible alias used by previous version internals.
export const alertInternals = notificationInternals;
