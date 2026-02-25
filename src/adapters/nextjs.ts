import { WebhookPlatform, NormalizeOptions } from '../types';
import { WebhookVerificationService } from '../index';
import { handleQueuedRequest, resolveQueueConfig } from '../upstash/queue';
import { QueueOption } from '../upstash/types';

export interface NextWebhookHandlerOptions<TPayload = any, TMetadata extends Record<string, unknown> = Record<string, unknown>, TResponse = unknown> {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  normalize?: boolean | NormalizeOptions;
  queue?: QueueOption;
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
        return handleQueuedRequest(request, {
          platform: options.platform,
          secret: options.secret,
          queueConfig,
          handler: options.handler as (payload: unknown, metadata: Record<string, unknown>) => Promise<unknown> | unknown,
          toleranceInSeconds: options.toleranceInSeconds ?? 300,
        });
      }

      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        request,
        options.platform,
        options.secret,
        options.toleranceInSeconds,
        options.normalize,
      );

      if (!result.isValid) {
        return Response.json({ error: result.error, errorCode: result.errorCode, platform: result.platform, metadata: result.metadata }, { status: 400 });
      }

      const data = await options.handler(result.payload as TPayload, (result.metadata || {}) as TMetadata);
      return Response.json(data);
    } catch (error) {
      options.onError?.(error as Error);
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
  };
}
