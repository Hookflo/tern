import {
  WebhookConfig,
  WebhookVerificationResult,
  WebhookPlatform,
  SignatureConfig,
} from './types';
import { createAlgorithmVerifier } from './verifiers/algorithms';
import { createCustomVerifier } from './verifiers/custom-algorithms';
import { getPlatformAlgorithmConfig } from './platforms/algorithms';
import { platformManager, PlatformName } from './platforms/manager';

export class WebhookVerificationService {
  static async verify(
    request: Request,
    config: WebhookConfig,
  ): Promise<WebhookVerificationResult> {
    const verifier = this.getVerifier(config);
    const result = await verifier.verify(request);

    // Ensure the platform is set correctly in the result
    if (result.isValid) {
      result.platform = config.platform;
    }

    return result;
  }

  private static getVerifier(config: WebhookConfig) {
    const platform = config.platform.toLowerCase() as WebhookPlatform;

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
    const platform = config.platform.toLowerCase() as WebhookPlatform;

    // For legacy support, we'll use the algorithm-based approach
    const platformConfig = getPlatformAlgorithmConfig(platform);
    const configWithSignature: WebhookConfig = {
      ...config,
      signatureConfig: platformConfig.signatureConfig,
    };

    return this.createAlgorithmBasedVerifier(configWithSignature);
  }

  // New method to create verifier using platform algorithm config
  static async verifyWithPlatformConfig(
    request: Request,
    platform: WebhookPlatform,
    secret: string,
    toleranceInSeconds: number = 300,
  ): Promise<WebhookVerificationResult> {
    // Try to use the new platform manager first
    if (platformManager.isPlatformSupported(platform as PlatformName)) {
      return platformManager.verify(request, platform as PlatformName, secret);
    }

    // Fallback to legacy method
    const platformConfig = getPlatformAlgorithmConfig(platform);
    const config: WebhookConfig = {
      platform,
      secret,
      toleranceInSeconds,
      signatureConfig: platformConfig.signatureConfig,
    };

    return await this.verify(request, config);
  }

  // Helper method to get all platforms using a specific algorithm
  static getPlatformsUsingAlgorithm(algorithm: string): WebhookPlatform[] {
    const { getPlatformsUsingAlgorithm } = require('./platforms/algorithms');
    return getPlatformsUsingAlgorithm(algorithm);
  }

  // Helper method to check if a platform uses a specific algorithm
  static platformUsesAlgorithm(platform: WebhookPlatform, algorithm: string): boolean {
    const { platformUsesAlgorithm } = require('./platforms/algorithms');
    return platformUsesAlgorithm(platform, algorithm);
  }

  // Helper method to validate signature config
  static validateSignatureConfig(config: SignatureConfig): boolean {
    const { validateSignatureConfig } = require('./platforms/algorithms');
    return validateSignatureConfig(config);
  }

  // Simple token-based verification for platforms like Supabase
  static async verifyTokenBased(
    request: Request,
    webhookId: string,
    webhookToken: string,
  ): Promise<WebhookVerificationResult> {
    try {
      const idHeader = request.headers.get('x-webhook-id');
      const tokenHeader = request.headers.get('x-webhook-token');

      if (!idHeader || !tokenHeader) {
        return {
          isValid: false,
          error: 'Missing required headers: x-webhook-id and x-webhook-token',
          platform: 'custom',
        };
      }

      // Simple comparison - we don't actually verify, just check if tokens match
      const isValid = idHeader === webhookId && tokenHeader === webhookToken;

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid webhook ID or token',
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
        payload,
        metadata: {
          id: idHeader,
          algorithm: 'token-based',
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Token-based verification error: ${(error as Error).message}`,
        platform: 'custom',
      };
    }
  }
}

export * from './types';
export {
  getPlatformAlgorithmConfig, platformUsesAlgorithm, getPlatformsUsingAlgorithm, validateSignatureConfig,
} from './platforms/algorithms';
export { createAlgorithmVerifier } from './verifiers/algorithms';
export { createCustomVerifier } from './verifiers/custom-algorithms';
export { platformManager } from './platforms/manager';

export default WebhookVerificationService;

export { Normalizer } from './normalization';
