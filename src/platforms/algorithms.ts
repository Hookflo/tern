import {
  PlatformAlgorithmConfig,
  WebhookPlatform,
  SignatureConfig,
} from '../types';

export const platformAlgorithmConfigs: Record<
  WebhookPlatform,
  PlatformAlgorithmConfig
> = {
  github: {
    platform: 'github',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-hub-signature-256',
      headerFormat: 'prefixed',
      prefix: 'sha256=',
      timestampHeader: undefined,
      payloadFormat: 'raw',
    },
    description: 'GitHub webhooks use HMAC-SHA256 with sha256= prefix',
  },

  stripe: {
    platform: 'stripe',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'stripe-signature',
      headerFormat: 'comma-separated',
      timestampHeader: undefined,
      payloadFormat: 'timestamped',
      customConfig: {
        signatureFormat: 't={timestamp},v1={signature}',
      },
    },
    description: 'Stripe webhooks use HMAC-SHA256 with comma-separated format',
  },

  clerk: {
    platform: 'clerk',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'svix-signature',
      headerFormat: 'raw',
      timestampHeader: 'svix-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'custom',
      customConfig: {
        signatureFormat: 'v1={signature}',
        payloadFormat: '{id}.{timestamp}.{body}',
        encoding: 'base64',
        idHeader: 'svix-id',
      },
    },
    description: 'Clerk webhooks use HMAC-SHA256 with base64 encoding',
  },

  dodopayments: {
    platform: 'dodopayments',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'webhook-signature',
      headerFormat: 'raw',
      timestampHeader: 'webhook-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'custom',
      customConfig: {
        signatureFormat: 'v1={signature}',
        payloadFormat: '{id}.{timestamp}.{body}',
        encoding: 'base64',
        idHeader: 'webhook-id',
      },
    },
    description:
      'Dodo Payments webhooks use HMAC-SHA256 with svix-style format (Standard Webhooks)',
  },

  shopify: {
    platform: 'shopify',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-shopify-hmac-sha256',
      headerFormat: 'raw',
      timestampHeader: 'x-shopify-shop-domain',
      payloadFormat: 'raw',
    },
    description: 'Shopify webhooks use HMAC-SHA256',
  },

  vercel: {
    platform: 'vercel',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-vercel-signature',
      headerFormat: 'raw',
      timestampHeader: 'x-vercel-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'raw',
    },
    description: 'Vercel webhooks use HMAC-SHA256',
  },

  polar: {
    platform: 'polar',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-polar-signature',
      headerFormat: 'raw',
      timestampHeader: 'x-polar-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'raw',
    },
    description: 'Polar webhooks use HMAC-SHA256',
  },

  supabase: {
    platform: 'supabase',
    signatureConfig: {
      algorithm: 'custom',
      headerName: 'x-webhook-token',
      headerFormat: 'raw',
      payloadFormat: 'raw',
      customConfig: {
        type: 'token-based',
        idHeader: 'x-webhook-id',
      },
    },
    description: 'Supabase webhooks use token-based authentication',
  },

  custom: {
    platform: 'custom',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-webhook-token',
      headerFormat: 'raw',
      payloadFormat: 'raw',
      customConfig: {
        type: 'token-based',
        idHeader: 'x-webhook-id',
      },
    },
    description: 'Custom webhook configuration',
  },

  unknown: {
    platform: 'unknown',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-webhook-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
    },
    description: 'Unknown platform - using default HMAC-SHA256',
  },
};

export function getPlatformAlgorithmConfig(
  platform: WebhookPlatform,
): PlatformAlgorithmConfig {
  return platformAlgorithmConfigs[platform] || platformAlgorithmConfigs.unknown;
}

export function platformUsesAlgorithm(
  platform: WebhookPlatform,
  algorithm: string,
): boolean {
  const config = getPlatformAlgorithmConfig(platform);
  return config.signatureConfig.algorithm === algorithm;
}

export function getPlatformsUsingAlgorithm(
  algorithm: string,
): WebhookPlatform[] {
  return Object.entries(platformAlgorithmConfigs)
    .filter(([_, config]) => config.signatureConfig.algorithm === algorithm)
    .map(([platform, _]) => platform as WebhookPlatform);
}

export function validateSignatureConfig(config: SignatureConfig): boolean {
  if (!config.algorithm || !config.headerName) {
    return false;
  }

  switch (config.algorithm) {
    case 'hmac-sha256':
    case 'hmac-sha1':
    case 'hmac-sha512':
      return true;
    case 'rsa-sha256':
    case 'ed25519':
      return !!config.customConfig?.publicKey;
    case 'custom':
      return !!config.customConfig;
    default:
      return false;
  }
}
