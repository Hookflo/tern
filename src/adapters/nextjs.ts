import { WebhookPlatform } from '../types';
import { WebhookVerificationService } from '../index';
import { handleQueuedRequest, resolveQueueConfig } from '../upstash/queue';
import { QueueOption } from '../upstash/types';
import { dispatchWebhookAlert } from '../notifications/dispatch';
import type { AlertConfig, SendAlertOptions } from '../notifications/types';

export interface NextWebhookHandlerOptions<TPayload = any, TMetadata extends Record<string, unknown> = Record<string, unknown>, TResponse = unknown> {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  twilioBaseUrl?: string;
  queue?: QueueOption;
  alerts?: AlertConfig;
  alert?: Omit<SendAlertOptions, 'dlq' | 'dlqId' | 'source' | 'eventId'>;
  onError?: (error: Error) => void;
  handler: (payload: TPayload, metadata: TMetadata) => Promise<TResponse> | TResponse;
}

export function createWebhookHandler<TPayload = any, TMetadata extends Record<string, unknown> = Record<string, unknown>, TResponse = unknown>(
  options: NextWebhookHandlerOptions<TPayload, TMetadata, TResponse>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      if (options.queue) {
        const queueConfig = resolveQueueConfig(options.queue);
        const response = await handleQueuedRequest(request, {
          platform: options.platform,
          secret: options.secret,
          queueConfig,
          handler: options.handler as (payload: unknown, metadata: Record<string, unknown>) => Promise<unknown> | unknown,
          toleranceInSeconds: options.toleranceInSeconds ?? 300,
        });

        if (response.ok) {
          let eventId: string | undefined;
          try {
            const body = await response.clone().json() as Record<string, unknown>;
            eventId = typeof body.eventId === 'string' ? body.eventId : undefined;
          } catch {
            eventId = undefined;
          }

          await dispatchWebhookAlert({
            alerts: options.alerts,
            source: options.platform,
            eventId,
            alert: options.alert,
          });
        }

        return response;
      }

      const result = await WebhookVerificationService.verify(
        request,
        {
          platform: options.platform,
          secret: options.secret,
          toleranceInSeconds: options.toleranceInSeconds,
          twilioBaseUrl: options.twilioBaseUrl,
        },
      );

      if (!result.isValid) {
        return Response.json({ error: result.error, errorCode: result.errorCode, platform: result.platform, metadata: result.metadata }, { status: 400 });
      }

      await dispatchWebhookAlert({
        alerts: options.alerts,
        source: options.platform,
        eventId: result.eventId,
        alert: options.alert,
      });

      const data = await options.handler(result.payload as TPayload, (result.metadata || {}) as TMetadata);
      return Response.json(data);
    } catch (error) {
      options.onError?.(error as Error);
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
  };
}
