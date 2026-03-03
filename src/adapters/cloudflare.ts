import { WebhookPlatform, NormalizeOptions } from '../types';
import { WebhookVerificationService } from '../index';
import { handleQueuedRequest, resolveQueueConfig } from '../upstash/queue';
import { QueueOption } from '../upstash/types';
import { dispatchWebhookAlert } from '../notifications/dispatch';
import type { AlertConfig, SendAlertOptions } from '../notifications/types';

export interface CloudflareWebhookHandlerOptions<TEnv = Record<string, unknown>, TPayload = any, TMetadata extends Record<string, unknown> = Record<string, unknown>, TResponse = unknown> {
  platform: WebhookPlatform;
  secret?: string;
  secretEnv?: string;
  toleranceInSeconds?: number;
  normalize?: boolean | NormalizeOptions;
  queue?: QueueOption;
  alerts?: AlertConfig;
  alert?: Omit<SendAlertOptions, 'dlq' | 'dlqId' | 'source' | 'eventId'>;
  onError?: (error: Error) => void;
  handler: (payload: TPayload, env: TEnv, metadata: TMetadata) => Promise<TResponse> | TResponse;
}

export function createWebhookHandler<TEnv = Record<string, unknown>, TPayload = any, TMetadata extends Record<string, unknown> = Record<string, unknown>, TResponse = unknown>(
  options: CloudflareWebhookHandlerOptions<TEnv, TPayload, TMetadata, TResponse>,
) {
  return async (request: Request, env: TEnv): Promise<Response> => {
    try {
      const secret = options.secret
        || (options.secretEnv ? (env as Record<string, string | undefined>)[options.secretEnv] : undefined);

      if (!secret) {
        return Response.json({ error: 'Webhook secret is not configured' }, { status: 500 });
      }

      if (options.queue) {
        const queueConfig = resolveQueueConfig(options.queue);
        const response = await handleQueuedRequest(request, {
          platform: options.platform,
          secret,
          queueConfig,
          handler: (payload: unknown, metadata: Record<string, unknown>) => options.handler(payload as TPayload, env, metadata as TMetadata),
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
        secret,
        options.toleranceInSeconds,
        options.normalize,
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

      const data = await options.handler(result.payload as TPayload, env, (result.metadata || {}) as TMetadata);
      return Response.json(data);
    } catch (error) {
      options.onError?.(error as Error);
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
  };
}
