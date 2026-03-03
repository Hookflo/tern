import type {
  AlertConfig,
  AlertDestination,
  AlertPayloadBuilderInput,
  SendAlertOptions,
} from './types';
import {
  DEFAULT_ALERT_MESSAGE,
  DEFAULT_ALERT_TITLE,
  DEFAULT_DLQ_MESSAGE,
  DEFAULT_DLQ_TITLE,
  DEFAULT_REPLAY_LABEL,
} from './constants';

export function compactMetadata(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata || Object.keys(metadata).length === 0) return undefined;

  const entries = Object.entries(metadata).slice(0, 8);
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join('\n');
}

export function resolveDestinations(config: AlertConfig): AlertDestination[] {
  const destinations: AlertDestination[] = [];

  if (config.slack?.enabled !== false && config.slack?.webhookUrl) {
    destinations.push({ channel: 'slack', webhookUrl: config.slack.webhookUrl });
  }

  if (config.discord?.enabled !== false && config.discord?.webhookUrl) {
    destinations.push({ channel: 'discord', webhookUrl: config.discord.webhookUrl });
  }

  return destinations;
}

export function normalizeAlertOptions(options: SendAlertOptions): AlertPayloadBuilderInput {
  const isDlq = options.dlq === true;
  const severity = options.severity || (isDlq ? 'error' : 'info');
  const title = options.title || (isDlq ? DEFAULT_DLQ_TITLE : DEFAULT_ALERT_TITLE);
  const message = options.message || (isDlq ? DEFAULT_DLQ_MESSAGE : DEFAULT_ALERT_MESSAGE);
  const replayLabel = options.replayLabel || DEFAULT_REPLAY_LABEL;

  return {
    ...options,
    dlq: isDlq,
    title,
    message,
    severity,
    replayLabel,
    eventId: options.eventId || options.dlqId,
  };
}
