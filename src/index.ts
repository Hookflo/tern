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

    for (const [platform, secret] of Object.entries(secrets)) {
      if (!secret) {
        continue;
      }

      const result = await this.verifyWithPlatformConfig<TPayload>(
        requestClone,
        platform.toLowerCase() as WebhookPlatform,
        secret,
        toleranceInSeconds,
        normalize,
      );

      if (result.isValid) {
        return result;
      }

      failedAttempts.push({
        platform: platform.toLowerCase() as WebhookPlatform,
        error: result.error,
        errorCode: result.errorCode,
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

  static detectPlatform(request: Request): WebhookPlatform {
    const headers = request.headers;

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
    if (headers.has('x-auth0-signature')) return 'auth0';
    if (headers.has('x-wc-webhook-signature')) return 'woocommerce';
    if (headers.has('x-fal-signature') || headers.has('x-fal-webhook-signature')) return 'falai';
    if (headers.has('x-shopify-hmac-sha256')) return 'shopify';
    if (headers.has('x-vercel-signature')) return 'vercel';
    if (headers.has('x-webhook-token') && headers.has('x-webhook-id')) return 'supabase';

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

  // Simple token-based verification for platforms like Supabase
  static async verifyTokenBased<TPayload = unknown>(
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

      // Simple comparison - we don't actually verify, just check if tokens match
      const isValid = idHeader === webhookId && tokenHeader === webhookToken;

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
