export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertChannel = 'slack' | 'discord';

export interface AlertChannelConfig {
  webhookUrl: string;
  enabled?: boolean;
}

export interface AlertConfig {
  slack?: AlertChannelConfig;
  discord?: AlertChannelConfig;
}

export interface SendAlertOptions {
  dlq?: boolean;
  dlqId?: string;
  eventId?: string;
  source?: string;

  // Optional overrides when needed.
  title?: string;
  message?: string;
  severity?: AlertSeverity;
  replayUrl?: string;
  replayLabel?: string;
  metadata?: Record<string, unknown>;
  branding?: boolean;
}

export interface SendAlertResult {
  channel: AlertChannel;
  webhookUrl: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export interface SendAlertSummary {
  success: boolean;
  total: number;
  delivered: number;
  results: SendAlertResult[];
}

export interface AlertDestination {
  channel: AlertChannel;
  webhookUrl: string;
}

export interface AlertPayloadBuilderInput extends SendAlertOptions {
  title: string;
  message: string;
  severity: AlertSeverity;
  replayLabel: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
}
