import {
  WebhookPlatform,
  WebhookVerificationResult,
} from '../types';
import { WebhookVerificationService } from '../index';
import { handleQueuedRequest, resolveQueueConfig } from '../upstash/queue';
import { QueueOption } from '../upstash/types';
import { toWebRequest, MinimalNodeRequest, hasParsedBody } from './shared';
import { dispatchWebhookAlert } from '../notifications/dispatch';
import type { AlertConfig, SendAlertOptions } from '../notifications/types';

export interface ExpressLikeResponse {
  status: (code: number) => ExpressLikeResponse;
  json: (payload: unknown) => unknown;
}

export interface ExpressLikeRequest extends MinimalNodeRequest {
  webhook?: WebhookVerificationResult;
}

export type ExpressLikeNext = (err?: unknown) => void;

export interface ExpressWebhookMiddlewareOptions {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  queue?: QueueOption;
  alerts?: AlertConfig;
  alert?: Omit<SendAlertOptions, 'dlq' | 'dlqId' | 'source' | 'eventId'>;
  onError?: (error: Error) => void;
  strictRawBody?: boolean;
}

export function createWebhookMiddleware(
  options: ExpressWebhookMiddlewareOptions,
) {
  return async (
    req: ExpressLikeRequest,
    res: ExpressLikeResponse,
    next: ExpressLikeNext,
  ): Promise<void> => {
    try {
      const strictRawBody = options.strictRawBody ?? true;
      if (strictRawBody && hasParsedBody(req)) {
        res.status(400).json({
          error: 'Webhook request body must be raw bytes. Configure express.raw({ type: "*/*" }) before this middleware.',
          errorCode: 'VERIFICATION_ERROR',
          platform: options.platform,
        });
        return;
      }

      const webRequest = await toWebRequest(req);

      if (options.queue) {
        const queueConfig = resolveQueueConfig(options.queue);
        const queueResponse = await handleQueuedRequest(webRequest, {
          platform: options.platform,
          secret: options.secret,
          queueConfig,
          toleranceInSeconds: options.toleranceInSeconds ?? 300,
        });

        const bodyText = await queueResponse.text();
        let body: unknown;
        if (bodyText) {
          try {
            body = JSON.parse(bodyText);
          } catch {
            body = { message: bodyText };
          }
        }

        res.status(queueResponse.status).json(body ?? {});

        if (queueResponse.ok) {
          const queueResult = body && typeof body === 'object' ? body as Record<string, unknown> : undefined;
          await dispatchWebhookAlert({
            alerts: options.alerts,
            source: options.platform,
            eventId: typeof queueResult?.eventId === 'string' ? queueResult.eventId : undefined,
            alert: options.alert,
          });
        }

        return;
      }

      const result = await WebhookVerificationService.verify(
        webRequest,
        {
          platform: options.platform,
          secret: options.secret,
          toleranceInSeconds: options.toleranceInSeconds,
        },
      );

      if (!result.isValid) {
        res.status(400).json({
          error: result.error,
          errorCode: result.errorCode,
          platform: result.platform,
          metadata: result.metadata,
        });
        return;
      }

      req.webhook = result;

      await dispatchWebhookAlert({
        alerts: options.alerts,
        source: options.platform,
        eventId: result.eventId,
        alert: options.alert,
      });

      next();
    } catch (error) {
      options.onError?.(error as Error);
      next(error);
    }
  };
}
