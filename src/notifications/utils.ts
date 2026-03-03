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

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function pickNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = asNonEmptyString(value);
    if (normalized) return normalized;
  }

  return undefined;
}

function resolveSourceFromObject(value: unknown): string | undefined {
  const object = asObject(value);
  if (!object) return undefined;

  return pickNonEmptyString(
    object.platform,
    object.provider,
    object.source,
    object.service,
    object.origin,
    object.type,
  );
}

function resolveEventIdFromObject(value: unknown): string | undefined {
  const object = asObject(value);
  if (!object) return undefined;

  return pickNonEmptyString(
    object.eventId,
    object.event_id,
    object.id,
    object.request_id,
    object.webhook_id,
    object.messageId,
    object.message_id,
  );
}

function resolveSource(options: SendAlertOptions): string | undefined {
  const metadata = options.metadata || {};
  const metadataPayload = asObject(metadata.payload);
  const metadataEvent = asObject(metadata.event);
  const metadataData = asObject(metadata.data);
  const metadataBody = asObject(metadata.body);

  return pickNonEmptyString(
    options.source,
    metadata.source,
    metadata.platform,
    metadata.provider,
    metadata.eventSource,
    resolveSourceFromObject(metadataPayload),
    resolveSourceFromObject(metadataEvent),
    resolveSourceFromObject(metadataData),
    resolveSourceFromObject(metadataBody),
  );
}

function resolveEventId(options: SendAlertOptions): string | undefined {
  const metadata = options.metadata || {};
  const metadataPayload = asObject(metadata.payload);
  const metadataEvent = asObject(metadata.event);
  const metadataData = asObject(metadata.data);

  return pickNonEmptyString(
    options.eventId,
    options.dlqId,
    metadata.eventId,
    metadata.event_id,
    metadata.messageId,
    metadata.message_id,
    metadata.webhookId,
    metadata.webhook_id,
    metadata.id,
    resolveEventIdFromObject(metadataPayload),
    resolveEventIdFromObject(metadataEvent),
    resolveEventIdFromObject(metadataData),
  );
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
    source: resolveSource(options) || 'unknown',
    title,
    message,
    severity,
    replayLabel,
    eventId: resolveEventId(options),
  };
}
