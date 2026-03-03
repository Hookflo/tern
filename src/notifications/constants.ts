import type { AlertSeverity } from './types';

export const TERN_BRAND_URL = 'https://tern.hookflo.com';
export const DEFAULT_DLQ_TITLE = 'Dead Letter Queue — Event Failed';
export const DEFAULT_ALERT_TITLE = 'Webhook Received';
export const DEFAULT_REPLAY_LABEL = 'Replay DLQ Event';
export const DEFAULT_DLQ_MESSAGE = 'Event exhausted all retries. Manual replay required.';
export const DEFAULT_ALERT_MESSAGE = 'Event verified and queued for processing.';

export const severityColorMap: Record<AlertSeverity, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  critical: '#7C3AED',
};
