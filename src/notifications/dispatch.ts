import type { AlertConfig, SendAlertOptions } from './types';
import { sendAlert } from './send-alert';

export interface DispatchWebhookAlertInput {
  alerts?: AlertConfig;
  source?: string;
  eventId?: string;
  alert?: Omit<SendAlertOptions, 'dlq' | 'dlqId' | 'source' | 'eventId'>;
}

export async function dispatchWebhookAlert(input: DispatchWebhookAlertInput): Promise<void> {
  if (!input.alerts) return;

  await sendAlert(input.alerts, {
    ...(input.alert || {}),
    source: input.source,
    eventId: input.eventId,
  });
}
