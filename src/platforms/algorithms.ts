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
      payloadFormat: 'raw',
      customConfig: {
        encoding: 'base64',
        secretEncoding: 'utf8',
      },
    },
    description:
      'Shopify webhooks use HMAC-SHA256 with base64 encoded signature',
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
      headerName: 'webhook-signature',
      headerFormat: 'raw',
      timestampHeader: 'webhook-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'custom',
      customConfig: {
        signatureFormat: 'v1={signature}',
        payloadFormat: '{id}.{timestamp}.{body}',
        encoding: 'base64',
        secretEncoding: 'utf8',
        idHeader: 'webhook-id',
      },
    },
    description: 'Polar webhooks use HMAC-SHA256 with Standard Webhooks format',
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
    description: 'GitLab webhooks use token-based authentication via X-Gitlab-Token header',
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
    description:
      'Paddle webhooks use HMAC-SHA256 with Paddle-Signature (ts/h1) header format',
  },

  razorpay: {
    platform: 'razorpay',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-razorpay-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
    },
    description:
      'Razorpay webhooks use HMAC-SHA256 with X-Razorpay-Signature header',
  },

  lemonsqueezy: {
    platform: 'lemonsqueezy',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
    },
    description:
      'Lemon Squeezy webhooks use HMAC-SHA256 with X-Signature header',
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
    description:
      'WorkOS webhooks use HMAC-SHA256 with WorkOS-Signature (t/v1) format',
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
    description:
      'WooCommerce webhooks use HMAC-SHA256 with base64 encoded signature',
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
    description:
      'Replicate webhooks use HMAC-SHA256 with Standard Webhooks (svix-style) format',
  },

  falai: {
    platform: 'falai',
    signatureConfig: {
      algorithm: 'ed25519',
      headerName: 'x-fal-webhook-signature',
      headerFormat: 'raw',
      payloadFormat: 'custom',
      customConfig: {
        requestIdHeader: 'x-fal-webhook-request-id',
        userIdHeader: 'x-fal-webhook-user-id',
        timestampHeader: 'x-fal-webhook-timestamp',
        jwksUrl: 'https://rest.alpha.fal.ai/.well-known/jwks.json',
      },
    },
    description:
      'fal.ai webhooks use ED25519 with JWKS key verification. No secret required — pass empty string.',
  },

  sentry: {
    platform: 'sentry',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'sentry-hook-signature',
      headerFormat: 'raw',
      timestampHeader: 'sentry-hook-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'json-stringified',
      idHeader: 'request-id',
      customConfig: {
        issueAlertPayloadPath: 'data.issue_alert',
      },
    },
    description:
      'Sentry webhooks use HMAC-SHA256 with JSON stringified body and Request-ID idempotency key',
  },

  grafana: {
    platform: 'grafana',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-grafana-alerting-signature',
      headerFormat: 'raw',
      timestampHeader: 'x-grafana-alerting-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'timestamped',
    },
    description:
      'Grafana 12+ webhooks support HMAC-SHA256 with optional timestamped payload format',
  },

  doppler: {
    platform: 'doppler',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-doppler-signature',
      headerFormat: 'prefixed',
      prefix: 'sha256=',
      payloadFormat: 'raw',
      customConfig: {
        dedupHashAlgorithm: 'sha256',
      },
    },
    description:
      'Doppler webhooks use HMAC-SHA256 with sha256= signature prefix and raw payload signing',
  },

  sanity: {
    platform: 'sanity',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'sanity-webhook-signature',
      headerFormat: 'comma-separated',
      payloadFormat: 'timestamped',
      customConfig: {
        timestampKey: 't',
        signatureKey: 'v1',
      },
      idHeader: 'idempotency-key',
    },
    description:
      'Sanity webhooks use Stripe-compatible signatures with timestamp/body payload and idempotency key header',
  },
  custom: {
    platform: 'custom',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-webhook-signature',
      headerFormat: 'raw',
      payloadFormat: 'raw',
      customConfig: {
        type: 'token-based',
        idHeader: 'x-webhook-id',
      },
    },
    description: 'Custom webhook configuration (supports token-based overrides via customConfig)',
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
    .filter(([, config]) => config.signatureConfig.algorithm === algorithm)
    .map(([platform]) => platform as WebhookPlatform);
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
