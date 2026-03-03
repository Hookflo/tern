export * from './notifications';

import { __notificationInternals } from './notifications';

// Backward-compatible alias used by previous version internals.
export const __alertInternals = __notificationInternals;
