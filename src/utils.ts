import { WebhookPlatform, WebhookPlatformKeys, SignatureConfig } from './types';
import { getPlatformAlgorithmConfig, validateSignatureConfig } from './platforms/algorithms';

/**
 * Utility functions for the scalable webhook verification framework
 */

/**
 * Get the recommended algorithm for a platform
 */
export function getRecommendedAlgorithm(platform: WebhookPlatform): string {
  const config = getPlatformAlgorithmConfig(platform);
  return config.signatureConfig.algorithm;
}

/**
 * Check if a platform supports a specific algorithm
 */
export function platformSupportsAlgorithm(platform: WebhookPlatform, algorithm: string): boolean {
  const config = getPlatformAlgorithmConfig(platform);
  return config.signatureConfig.algorithm === algorithm;
}

/**
 * Get all platforms that support a specific algorithm
 */
export function getPlatformsByAlgorithm(algorithm: string): WebhookPlatform[] {
  const { getPlatformsUsingAlgorithm } = require('./platforms/algorithms');
  return getPlatformsUsingAlgorithm(algorithm);
}

/**
 * Create a signature config for a platform
 */
export function createSignatureConfigForPlatform(platform: WebhookPlatform): SignatureConfig {
  const config = getPlatformAlgorithmConfig(platform);
  return config.signatureConfig;
}

/**
 * Validate a signature config
 */
export function isValidSignatureConfig(config: SignatureConfig): boolean {
  return validateSignatureConfig(config);
}

/**
 * Get platform description
 */
export function getPlatformDescription(platform: WebhookPlatform): string {
  const config = getPlatformAlgorithmConfig(platform);
  return config.description || `Webhook verification for ${platform}`;
}

/**
 * Check if a platform uses custom algorithm
 */
export function isCustomAlgorithm(platform: WebhookPlatform): boolean {
  const config = getPlatformAlgorithmConfig(platform);
  return config.signatureConfig.algorithm === 'custom';
}

/**
 * Get algorithm statistics
 */
export function getAlgorithmStats() {
  const platforms = Object.values(WebhookPlatformKeys);
  const stats: Record<string, number> = {};

  for (const platform of platforms) {
    const config = getPlatformAlgorithmConfig(platform);
    const { algorithm } = config.signatureConfig;
    stats[algorithm] = (stats[algorithm] || 0) + 1;
  }

  return stats;
}

/**
 * Get most common algorithm
 */
export function getMostCommonAlgorithm(): string {
  const stats = getAlgorithmStats();
  return Object.entries(stats).reduce((a, b) => (stats[a[0]] > stats[b[0]] ? a : b))[0];
}

/**
 * Check if a request matches a platform's signature pattern
 */
export function detectPlatformFromHeaders(headers: Headers): WebhookPlatform | null {
  const headerMap = new Map<string, string>();
  headers.forEach((value, key) => {
    headerMap.set(key.toLowerCase(), value);
  });

  // GitHub
  if (headerMap.has('x-hub-signature-256')) {
    return 'github';
  }

  // Stripe
  if (headerMap.has('stripe-signature')) {
    return 'stripe';
  }

  // Clerk
  if (headerMap.has('svix-signature')) {
    return 'clerk';
  }

  // Dodo Payments
  if (headerMap.has('workos-signature')) {
    return 'workos';
  }

  if (headerMap.has('webhook-signature')) {
    const userAgent = headerMap.get('user-agent') || '';
    if (userAgent.includes('replicate')) {
      return 'replicateai';
    }
    return 'dodopayments';
  }

  if (headerMap.has('paddle-signature')) {
    return 'paddle';
  }

  if (headerMap.has('x-razorpay-signature')) {
    return 'razorpay';
  }

  if (headerMap.has('x-signature')) {
    return 'lemonsqueezy';
  }

  if (headerMap.has('x-auth0-signature')) {
    return 'auth0';
  }

  if (headerMap.has('x-wc-webhook-signature')) {
    return 'woocommerce';
  }

  if (headerMap.has('x-fal-signature') || headerMap.has('x-fal-webhook-signature')) {
    return 'falai';
  }

  // Shopify
  if (headerMap.has('x-shopify-hmac-sha256')) {
    return 'shopify';
  }

  // Vercel
  if (headerMap.has('x-vercel-signature')) {
    return 'vercel';
  }

  // Polar
  if (headerMap.has('x-polar-signature')) {
    return 'polar';
  }

  if (headerMap.has('webhook-signature')) {
    const userAgent = (headerMap.get('user-agent') || '').toLowerCase();
    if (userAgent.includes('polar')) {
      return 'polar';
    }
  }

  // Supabase
  if (headerMap.has('x-webhook-token')) {
    return 'supabase';
  }

  return null;
}

/**
 * Get platform configuration summary
 */
export function getPlatformSummary(): Array<{
  platform: WebhookPlatform;
  algorithm: string;
  description: string;
  isCustom: boolean;
}> {
  const platforms = Object.values(WebhookPlatformKeys);

  return platforms.map((platform) => {
    const config = getPlatformAlgorithmConfig(platform);
    return {
      platform,
      algorithm: config.signatureConfig.algorithm,
      description: config.description || '',
      isCustom: config.signatureConfig.algorithm === 'custom',
    };
  });
}

/**
 * Compare two signature configs
 */
export function compareSignatureConfigs(config1: SignatureConfig, config2: SignatureConfig): boolean {
  return JSON.stringify(config1) === JSON.stringify(config2);
}

/**
 * Clone a signature config
 */
export function cloneSignatureConfig(config: SignatureConfig): SignatureConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Merge signature configs (config2 overrides config1)
 */
export function mergeSignatureConfigs(config1: SignatureConfig, config2: Partial<SignatureConfig>): SignatureConfig {
  return { ...config1, ...config2 };
}

/**
 * Validate platform configuration
 */
export function validatePlatformConfig(platform: WebhookPlatform): boolean {
  try {
    const config = getPlatformAlgorithmConfig(platform);
    return validateSignatureConfig(config.signatureConfig);
  } catch {
    return false;
  }
}

/**
 * Get all valid platforms
 */
export function getValidPlatforms(): WebhookPlatform[] {
  const platforms = Object.values(WebhookPlatformKeys);
  return platforms.filter((platform) => validatePlatformConfig(platform));
}

/**
 * Get platforms by algorithm type
 */
export function getPlatformsByAlgorithmType(): Record<string, WebhookPlatform[]> {
  const platforms = Object.values(WebhookPlatformKeys);
  const result: Record<string, WebhookPlatform[]> = {};

  for (const platform of platforms) {
    const config = getPlatformAlgorithmConfig(platform);
    const { algorithm } = config.signatureConfig;

    if (!result[algorithm]) {
      result[algorithm] = [];
    }

    result[algorithm].push(platform);
  }

  return result;
}

export function cleanHeaders(
  headers: Record<string, string | undefined>,
): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
