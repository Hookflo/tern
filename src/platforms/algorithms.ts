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
        secretEncoding: 'base64',
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
        secretEncoding: 'base64',
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

  gitlab: {
    platform: 'gitlab',
    signatureConfig: {
      algorithm: 'custom',
      headerName: 'X-Gitlab-Token',
      headerFormat: 'raw',
      payloadFormat: 'raw',
      customConfig: {
        type: 'token-based',
        idHeader: 'X-Gitlab-Token',
      },
    },
    description: 'GitLab webhooks use HMAC-SHA256 with X-Gitlab-Token header',
  },

  paddle: {
    platform: 'paddle',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'paddle-signature',
      headerFormat: 'comma-separated',
      payloadFormat: 'custom',
      customConfig: {
        timestampKey: 'ts',
        signatureKey: 'h1',
        payloadFormat: '{timestamp}:{body}',
      },
    },
    description: 'Paddle webhooks use HMAC-SHA256 with Paddle-Signature (ts/h1) header format',
  },

  razorpay: {
    platform: 'razorpay',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-razorpay-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
    },
    description: 'Razorpay webhooks use HMAC-SHA256 with X-Razorpay-Signature header',
  },

  lemonsqueezy: {
    platform: 'lemonsqueezy',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
    },
    description: 'Lemon Squeezy webhooks use HMAC-SHA256 with X-Signature header',
  },

  auth0: {
    platform: 'auth0',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-auth0-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
    },
    description: 'Auth0 webhooks use HMAC-SHA256 with X-Auth0-Signature header',
  },

  workos: {
    platform: 'workos',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'workos-signature',
      headerFormat: 'comma-separated',
      payloadFormat: 'custom',
      customConfig: {
        timestampKey: 't',
        signatureKey: 'v1',
        payloadFormat: '{timestamp}.{body}',
      },
    },
    description: 'WorkOS webhooks use HMAC-SHA256 with WorkOS-Signature (t/v1) format',
  },

  woocommerce: {
    platform: 'woocommerce',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-wc-webhook-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
      customConfig: {
        encoding: 'base64',
        secretEncoding: 'utf8',
      },
    },
    description: 'WooCommerce webhooks use HMAC-SHA256 with base64 encoded signature',
  },

  replicateai: {
    platform: 'replicateai',
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
        secretEncoding: 'base64',
        idHeader: 'webhook-id',
      },
    },
    description: 'Replicate webhooks use HMAC-SHA256 with Standard Webhooks (svix-style) format',
  },

  falai: {
    platform: 'falai',
    signatureConfig: {
      algorithm: 'ed25519',
      headerName: 'x-fal-webhook-signature',
      headerFormat: 'raw',
      payloadFormat: 'custom',
      customConfig: {
        requestIdHeader: 'x-fal-request-id',
        userIdHeader: 'x-fal-user-id',
        timestampHeader: 'x-fal-webhook-timestamp',
        kidHeader: 'x-fal-webhook-key-id',
        jwksUrl: 'https://rest.alpha.fal.ai/.well-known/jwks.json',
      },
    },
    description: 'fal.ai webhooks use ED25519 with a signed request/user/timestamp/body-hash payload',
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
      return !!config.customConfig?.publicKey;
    case 'ed25519':
      return !!config.customConfig?.publicKey || !!config.customConfig?.jwksUrl;
    case 'custom':
      return !!config.customConfig;
    default:
      return false;
  }
}
