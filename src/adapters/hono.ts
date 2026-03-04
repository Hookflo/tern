import { WebhookPlatform, NormalizeOptions } from '../types';
import { WebhookVerificationService } from '../index';
import { handleQueuedRequest, resolveQueueConfig } from '../upstash/queue';
import { QueueOption } from '../upstash/types';
import { dispatchWebhookAlert } from '../notifications/dispatch';
import type { AlertConfig, SendAlertOptions } from '../notifications/types';

export interface HonoContextLike {
  req: {
    raw: Request;
  };
  json: (payload: unknown, status?: number) => Response;
}

export interface HonoWebhookHandlerOptions<
  TContext extends HonoContextLike = HonoContextLike,
  TPayload = any,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
  TResponse = unknown,
> {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  normalize?: boolean | NormalizeOptions;
  queue?: QueueOption;
  alerts?: AlertConfig;
  alert?: Omit<SendAlertOptions, 'dlq' | 'dlqId' | 'source' | 'eventId'>;
  onError?: (error: Error) => void;
  handler: (payload: TPayload, metadata: TMetadata, c: TContext) => Promise<TResponse> | TResponse;
}

export function createWebhookHandler<
  TContext extends HonoContextLike = HonoContextLike,
  TPayload = any,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
  TResponse = unknown,
>(
  options: HonoWebhookHandlerOptions<TContext, TPayload, TMetadata, TResponse>,
) {
  return async (c: TContext): Promise<Response> => {
    try {
      const request = c.req.raw;

      if (options.queue) {
        const queueConfig = resolveQueueConfig(options.queue);
        const response = await handleQueuedRequest(request, {
          platform: options.platform,
          secret: options.secret,
          queueConfig,
          handler: (payload: unknown, metadata: Record<string, unknown>) => options.handler(payload as TPayload, metadata as TMetadata, c),
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

      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        request,
        options.platform,
        options.secret,
        options.toleranceInSeconds,
        options.normalize,
      );

      if (!result.isValid) {
        return c.json({
          error: result.error,
          errorCode: result.errorCode,
          platform: result.platform,
          metadata: result.metadata,
        }, 400);
      }

      await dispatchWebhookAlert({
        alerts: options.alerts,
        source: options.platform,
        eventId: result.eventId,
        alert: options.alert,
      });

      const data = await options.handler(result.payload as TPayload, (result.metadata || {}) as TMetadata, c);
      if (data instanceof Response) {
        return data;
      }

      return c.json(data);
    } catch (error) {
      if (options.onError) {
        options.onError(error as Error);
      } else {
        console.error('[tern/hono]', error);
      }
      return c.json({ error: (error as Error).message }, 500);
    }
  };
}
