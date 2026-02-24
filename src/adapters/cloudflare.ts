import { WebhookPlatform, NormalizeOptions } from '../types';
import { WebhookVerificationService } from '../index';

export interface CloudflareWebhookHandlerOptions<TEnv = Record<string, unknown>, TResponse = unknown> {
  platform: WebhookPlatform;
  secret?: string;
  secretEnv?: string;
  toleranceInSeconds?: number;
  normalize?: boolean | NormalizeOptions;
  onError?: (error: Error) => void;
  handler: (payload: unknown, env: TEnv, metadata: Record<string, unknown>) => Promise<TResponse> | TResponse;
}

export function createWebhookHandler<TEnv = Record<string, unknown>, TResponse = unknown>(
  options: CloudflareWebhookHandlerOptions<TEnv, TResponse>,
) {
  return async (request: Request, env: TEnv): Promise<Response> => {
    try {
      const secret = options.secret
        || (options.secretEnv ? (env as Record<string, string | undefined>)[options.secretEnv] : undefined);

      if (!secret) {
        return Response.json({ error: 'Webhook secret is not configured' }, { status: 500 });
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

      const data = await options.handler(result.payload, env, result.metadata || {});
      return Response.json(data);
    } catch (error) {
      options.onError?.(error as Error);
      return Response.json({ error: (error as Error).message }, { status: 500 });
    }
  };
}
