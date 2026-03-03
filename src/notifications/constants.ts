import type { AlertSeverity } from './types';

export const TERN_BRAND_URL = 'https://tern.hookflo.com';
export const DEFAULT_DLQ_TITLE = 'DLQ Event Alert';
export const DEFAULT_ALERT_TITLE = 'Webhook Event Alert';
export const DEFAULT_REPLAY_LABEL = 'Replay DLQ Event';
export const DEFAULT_DLQ_MESSAGE = 'Webhook event moved to DLQ after retry attempts.';
export const DEFAULT_ALERT_MESSAGE = 'Webhook event received.';

export const severityColorMap: Record<AlertSeverity, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  critical: '#7C3AED',
};
