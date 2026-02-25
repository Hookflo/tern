import {
  WebhookPlatform,
  WebhookVerificationResult,
  NormalizeOptions,
} from '../types';
import { WebhookVerificationService } from '../index';
import { handleQueuedRequest, resolveQueueConfig } from '../upstash/queue';
import { QueueOption } from '../upstash/types';
import { toWebRequest, MinimalNodeRequest } from './shared';

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
  normalize?: boolean | NormalizeOptions;
  queue?: QueueOption;
  onError?: (error: Error) => void;
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
        let body: unknown = undefined;
        if (bodyText) {
          try {
            body = JSON.parse(bodyText);
          } catch {
            body = { message: bodyText };
          }
        }

        res.status(queueResponse.status).json(body ?? {});
        return;
      }

      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        webRequest,
        options.platform,
        options.secret,
        options.toleranceInSeconds,
        options.normalize,
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
      next();
    } catch (error) {
      options.onError?.(error as Error);
      next(error);
    }
  };
}
