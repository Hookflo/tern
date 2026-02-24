import { WebhookPlatform, NormalizeOptions } from '../types';
import { WebhookVerificationService } from '../index';

export interface NextWebhookHandlerOptions<TResponse = unknown> {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  normalize?: boolean | NormalizeOptions;
  onError?: (error: Error) => void;
  handler: (payload: unknown, metadata: Record<string, unknown>) => Promise<TResponse> | TResponse;
}

export function createWebhookHandler<TResponse = unknown>(
  options: NextWebhookHandlerOptions<TResponse>,
) {
  return async (request: Request): Promise<Response> => {
    try {
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

      const data = await options.handler(result.payload, result.metadata || {});
      return Response.json(data);
    } catch (error) {
      options.onError?.(error as Error);
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
  };
}
