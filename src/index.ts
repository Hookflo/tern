import { timingSafeEqual } from 'crypto';
import {
  WebhookConfig,
  WebhookVerificationResult,
  WebhookPlatform,
  SignatureConfig,
  MultiPlatformSecrets,
  NormalizeOptions,
  WebhookErrorCode,
} from './types';
import { createAlgorithmVerifier } from './verifiers/algorithms';
import { createCustomVerifier } from './verifiers/custom-algorithms';
import {
  getPlatformAlgorithmConfig,
  getPlatformsUsingAlgorithm,
  platformUsesAlgorithm,
  validateSignatureConfig,
} from './platforms/algorithms';
import { normalizePayload } from './normalization/simple';
import type { QueueOption } from './upstash/types';

export class WebhookVerificationService {
  static async verify<TPayload = unknown>(
    request: Request,
    config: WebhookConfig,
  ): Promise<WebhookVerificationResult<TPayload>> {
    const verifier = this.getVerifier(config);
    const result = await verifier.verify(request.clone());

    // Ensure the platform is set correctly in the result
    if (result.isValid) {
      result.platform = config.platform;
      result.eventId = this.resolveCanonicalEventId(
        config.platform,
        result.metadata,
        result.payload as Record<string, any>,
      ) ?? undefined;

      if (config.normalize) {
        result.payload = normalizePayload(config.platform, result.payload, config.normalize);
      }
    }

    return result as WebhookVerificationResult<TPayload>;
  }

  private static getVerifier(config: WebhookConfig) {
    // If a custom signature config is provided, use the new algorithm-based framework
    if (config.signatureConfig) {
      return this.createAlgorithmBasedVerifier(config);
    }

    // Fallback to platform-specific verifiers for backward compatibility
    return this.getLegacyVerifier(config);
  }

  private static createAlgorithmBasedVerifier(config: WebhookConfig) {
    const { signatureConfig, secret, toleranceInSeconds = 300 } = config;

    if (!signatureConfig) {
      throw new Error('Signature config is required for algorithm-based verification');
    }

    // Use custom verifiers for special cases (token-based, etc.)
    if (signatureConfig.algorithm === 'custom') {
      return createCustomVerifier(secret, signatureConfig, toleranceInSeconds);
    }

    // Use algorithm-based verifiers for standard algorithms
    return createAlgorithmVerifier(secret, signatureConfig, config.platform, toleranceInSeconds);
  }

  private static getLegacyVerifier(config: WebhookConfig) {
    // For legacy support, we'll use the algorithm-based approach
    const platformConfig = getPlatformAlgorithmConfig(config.platform);
    const configWithSignature: WebhookConfig = {
      ...config,
      signatureConfig: platformConfig.signatureConfig,
    };

    return this.createAlgorithmBasedVerifier(configWithSignature);
  }

  // New method to create verifier using platform algorithm config
  static async verifyWithPlatformConfig<TPayload = unknown>(
    request: Request,
    platform: WebhookPlatform,
    secret: string,
    toleranceInSeconds: number = 300,
    normalize: boolean | NormalizeOptions = false,
  ): Promise<WebhookVerificationResult<TPayload>> {
    const platformConfig = getPlatformAlgorithmConfig(platform);
    const config: WebhookConfig = {
      platform,
      secret,
      toleranceInSeconds,
      signatureConfig: platformConfig.signatureConfig,
      normalize,
    };

    return this.verify<TPayload>(request, config);
  }

  static async verifyAny<TPayload = unknown>(
    request: Request,
    secrets: MultiPlatformSecrets,
    toleranceInSeconds: number = 300,
    normalize: boolean | NormalizeOptions = false,
  ): Promise<WebhookVerificationResult<TPayload>> {
    const requestClone = request.clone();

    const detectedPlatform = this.detectPlatform(requestClone);
    if (detectedPlatform !== 'unknown' && secrets[detectedPlatform]) {
      return this.verifyWithPlatformConfig<TPayload>(
        requestClone,
        detectedPlatform,
        secrets[detectedPlatform] as string,
        toleranceInSeconds,
        normalize,
      );
    }

    const failedAttempts: Array<{
      platform: WebhookPlatform;
      error?: string;
      errorCode?: WebhookErrorCode;
    }> = [];

    const verificationResults = await Promise.all(
      Object.entries(secrets)
        .filter(([, secret]) => Boolean(secret))
        .map(async ([platform, secret]) => {
          const normalizedPlatform = platform.toLowerCase() as WebhookPlatform;
          const result = await this.verifyWithPlatformConfig<TPayload>(
            requestClone,
            normalizedPlatform,
            secret as string,
            toleranceInSeconds,
            normalize,
          );

          return {
            platform: normalizedPlatform,
            result,
          };
        }),
    );

    const firstValid = verificationResults.find((item) => item.result.isValid);
    if (firstValid) {
      return firstValid.result;
    }

    for (const item of verificationResults) {
      failedAttempts.push({
        platform: item.platform,
        error: item.result.error,
        errorCode: item.result.errorCode,
      });
    }

    const details = failedAttempts
      .map((attempt) => `${attempt.platform}: ${attempt.error || 'verification failed'}`)
      .join('; ');

    return {
      isValid: false,
      error: details
        ? `Unable to verify webhook with provided platform secrets. Attempts -> ${details}`
        : 'Unable to verify webhook with provided platform secrets',
      errorCode: failedAttempts.find((attempt) => attempt.errorCode)?.errorCode || 'VERIFICATION_ERROR',
      platform: detectedPlatform,
      metadata: {
        attempts: failedAttempts,
      },
    };
  }

  private static resolveCanonicalEventId(
    platform: WebhookPlatform,
    metadata?: Record<string, any>,
    payload?: Record<string, any>,
  ): string | null {
    const rawId = this.resolveRawEventId(platform, metadata, payload);
    if (!rawId) return null;
    return `${platform}_${rawId}`;
  }

  private static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(
      new TextEncoder().encode(a),
      new TextEncoder().encode(b),
    );
  }

  private static pickString(...candidates: Array<unknown>): string | undefined {
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) {
        continue;
      }

      const normalized = `${candidate}`.trim();
      if (normalized.length > 0 && normalized !== 'undefined' && normalized !== 'null') {
        return normalized;
      }
    }

    return undefined;
  }

  private static resolveRawEventId(
    platform: WebhookPlatform,
    metadata?: Record<string, any>,
    payload?: Record<string, any>,
  ): string | null {
    switch (platform as string) {
      case 'stripe':
        return this.pickString(payload?.request?.idempotency_key, payload?.id) || null;
      case 'github':
        return this.pickString(metadata?.delivery) || null;
      case 'clerk':
        return this.pickString(metadata?.id) || null;
      case 'shopify':
        return this.pickString(metadata?.id, payload?.id) || null;
      case 'paddle':
        return this.pickString(payload?.event_id, payload?.data?.id) || null;
      case 'polar':
        return this.pickString(payload?.data?.id, payload?.id) || null;
      case 'dodopayments':
        return this.pickString(
          payload?.data?.payment_id,
          payload?.data?.subscription_id,
          payload?.data?.id,
        ) || null;
      case 'falai':
        return this.pickString(payload?.request_id) || null;
      case 'replicateai':
      case 'replicate':
        return this.pickString(payload?.id) || null;
      case 'workos':
      case 'sentry':
      case 'vercel':
        return this.pickString(payload?.id) || null;
      case 'doppler':
        return this.pickString(payload?.event?.id, metadata?.id) || null;
      case 'sanity':
        return this.pickString(payload?.transactionId, payload?.['_id']) || null;
      case 'razorpay':
        return this.pickString(
          payload?.payload?.payment?.entity?.id,
          payload?.payload?.order?.entity?.id,
          payload?.payload?.subscription?.entity?.id,
        ) || null;
      case 'lemonsqueezy': {
        const dataId = this.pickString(payload?.data?.id);
        if (!dataId) return null;

        const eventName = this.pickString(payload?.meta?.event_name);
        return eventName ? `${eventName}_${dataId}` : null;
      }
      case 'gitlab':
        return this.pickString(payload?.object_attributes?.id?.toString()) || null;
      case 'grafana':
        return this.pickString(payload?.groupKey, payload?.alerts?.[0]?.fingerprint) || null;
      case 'woocommerce':
        return this.pickString(payload?.id?.toString()) || null;
      default:
        return this.pickString(
          payload?.idempotency_key,
          payload?.event_id,
          payload?.webhook_id,
          payload?.id,
          metadata?.id,
          metadata?.delivery,
        ) || null;
    }
  }

  static detectPlatform(request: Request): WebhookPlatform {
    const { headers } = request;

    if (headers.has('stripe-signature')) return 'stripe';
    if (headers.has('x-hub-signature-256')) return 'github';
    if (headers.has('svix-signature')) return 'clerk';
    if (headers.has('workos-signature')) return 'workos';
    if (headers.has('webhook-signature')) {
      const userAgent = headers.get('user-agent')?.toLowerCase() || '';
      if (userAgent.includes('polar')) return 'polar';
      if (userAgent.includes('replicate')) return 'replicateai';
      return 'dodopayments';
    }
    if (headers.has('x-gitlab-token')) return 'gitlab';
    if (headers.has('x-polar-signature')) return 'polar';
    if (headers.has('paddle-signature')) return 'paddle';
    if (headers.has('x-razorpay-signature')) return 'razorpay';
    if (headers.has('x-signature')) return 'lemonsqueezy';
    if (headers.has('x-wc-webhook-signature')) return 'woocommerce';
    if (headers.has('x-fal-signature') || headers.has('x-fal-webhook-signature')) return 'falai';
    if (headers.has('sentry-hook-signature')) return 'sentry';
    if (headers.has('x-grafana-alerting-signature')) return 'grafana';
    if (headers.has('x-doppler-signature')) return 'doppler';
    if (headers.has('sanity-webhook-signature')) return 'sanity';
    if (headers.has('x-shopify-hmac-sha256')) return 'shopify';
    if (headers.has('x-vercel-signature')) return 'vercel';

    return 'unknown';
  }

  // Helper method to get all platforms using a specific algorithm
  static getPlatformsUsingAlgorithm(algorithm: string): WebhookPlatform[] {
    return getPlatformsUsingAlgorithm(algorithm);
  }

  // Helper method to check if a platform uses a specific algorithm
  static platformUsesAlgorithm(platform: WebhookPlatform, algorithm: string): boolean {
    return platformUsesAlgorithm(platform, algorithm);
  }

  // Helper method to validate signature config
  static validateSignatureConfig(config: SignatureConfig): boolean {
    return validateSignatureConfig(config);
  }

  // Simple token-based verification helper for token-auth providers
  static async verifyTokenAuth<TPayload = unknown>(
    request: Request,
    webhookId: string,
    webhookToken: string,
  ): Promise<WebhookVerificationResult<TPayload>> {
    try {
      const idHeader = request.headers.get('x-webhook-id');
      const tokenHeader = request.headers.get('x-webhook-token');

      if (!idHeader || !tokenHeader) {
        return {
          isValid: false,
          error: 'Missing required headers: x-webhook-id and x-webhook-token',
          errorCode: 'MISSING_TOKEN',
          platform: 'custom',
        };
      }

      const isValid = this.safeCompare(idHeader, webhookId)
        && this.safeCompare(tokenHeader, webhookToken);

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid webhook ID or token',
          errorCode: 'INVALID_TOKEN',
          platform: 'custom',
        };
      }

      const rawBody = await request.text();
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        payload = rawBody;
      }

      return {
        isValid: true,
        platform: 'custom',
        payload: payload as TPayload,
        eventId: `custom:${idHeader}`,
        metadata: {
          id: idHeader,
          algorithm: 'token-based',
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Token-based verification error: ${(error as Error).message}`,
        errorCode: 'VERIFICATION_ERROR',
        platform: 'custom',
      };
    }
  }

  static async handleWithQueue(
    request: Request,
    options: {
      platform: WebhookPlatform;
      secret: string;
      queue: QueueOption;
      handler: (payload: unknown, metadata: Record<string, unknown>) => Promise<unknown> | unknown;
      toleranceInSeconds?: number;
    },
  ): Promise<Response> {
    const { resolveQueueConfig, handleQueuedRequest } = await import('./upstash/queue');

    const queueConfig = resolveQueueConfig(options.queue);
    return handleQueuedRequest(request, {
      platform: options.platform,
      secret: options.secret,
      queueConfig,
      handler: options.handler,
      toleranceInSeconds: options.toleranceInSeconds ?? 300,
    });
  }
  static async verifyTokenBased<TPayload = unknown>(
    request: Request,
    webhookId: string,
    webhookToken: string,
  ): Promise<WebhookVerificationResult<TPayload>> {
    return this.verifyTokenAuth<TPayload>(request, webhookId, webhookToken);
  }
}

export * from './types';
export {
  getPlatformAlgorithmConfig,
  platformUsesAlgorithm,
  getPlatformsUsingAlgorithm,
  validateSignatureConfig,
} from './platforms/algorithms';
export { createAlgorithmVerifier } from './verifiers/algorithms';
export { createCustomVerifier } from './verifiers/custom-algorithms';
export {
  normalizePayload,
  getPlatformNormalizationCategory,
  getPlatformsByCategory,
} from './normalization/simple';
export * from './adapters';

export default WebhookVerificationService;
