import { WebhookPlatform, WebhookVerificationResult, NormalizeOptions } from '../types';
import { WebhookVerificationService } from '../index';
import { toWebRequest, MinimalNodeRequest } from './shared';

export interface ExpressLikeResponse {
  status: (code: number) => ExpressLikeResponse;
  json: (payload: unknown) => unknown;
}

export interface ExpressLikeRequest extends MinimalNodeRequest {
  webhook?: WebhookVerificationResult;
}

export type ExpressLikeNext = () => void;

export interface ExpressWebhookMiddlewareOptions {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  normalize?: boolean | NormalizeOptions;
  onError?: (error: Error) => void;
}

export function createWebhookMiddleware(options: ExpressWebhookMiddlewareOptions) {
  return async (
    req: ExpressLikeRequest,
    res: ExpressLikeResponse,
    next: ExpressLikeNext,
  ): Promise<void> => {
    try {
      const webRequest = await toWebRequest(req);

      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        webRequest,
        options.platform,
        options.secret,
        options.toleranceInSeconds,
        options.normalize,
      );

      if (!result.isValid) {
        res.status(400).json({ error: result.error, errorCode: result.errorCode, platform: result.platform, metadata: result.metadata });
        return;
      }

      req.webhook = result;
      next();
    } catch (error) {
      options.onError?.(error as Error);
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
