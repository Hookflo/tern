import {
  PlatformAlgorithmConfig,
  WebhookPlatform,
  SignatureConfig,
} from "../types";

// Platform to algorithm mapping configuration
export const platformAlgorithmConfigs: Record<
  WebhookPlatform,
  PlatformAlgorithmConfig
> = {
  // GitHub uses HMAC-SHA256 with prefixed signature
  github: {
    platform: "github",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "x-hub-signature-256",
      headerFormat: "prefixed",
      prefix: "sha256=",
      timestampHeader: undefined, // GitHub doesn't use timestamp validation
      payloadFormat: "raw",
    },
    description: "GitHub webhooks use HMAC-SHA256 with sha256= prefix",
  },

  // Stripe uses HMAC-SHA256 with comma-separated format
  stripe: {
    platform: "stripe",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "stripe-signature",
      headerFormat: "comma-separated",
      timestampHeader: undefined, // Timestamp is embedded in signature
      payloadFormat: "timestamped",
      customConfig: {
        signatureFormat: "t={timestamp},v1={signature}",
      },
    },
    description: "Stripe webhooks use HMAC-SHA256 with comma-separated format",
  },

  // Clerk uses HMAC-SHA256 with custom base64 encoding
  clerk: {
    platform: "clerk",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "svix-signature",
      headerFormat: "raw",
      timestampHeader: "svix-timestamp",
      timestampFormat: "unix",
      payloadFormat: "custom",
      customConfig: {
        signatureFormat: "v1={signature}",
        payloadFormat: "{id}.{timestamp}.{body}",
        encoding: "base64",
        idHeader: "svix-id",
      },
    },
    description: "Clerk webhooks use HMAC-SHA256 with base64 encoding",
  },

  // Dodo Payments uses HMAC-SHA256
  dodopayments: {
    platform: "dodopayments",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "webhook-signature",
      headerFormat: "raw",
      timestampHeader: "webhook-timestamp",
      timestampFormat: "unix",
      payloadFormat: "raw",
    },
    description: "Dodo Payments webhooks use HMAC-SHA256",
  },

  // Shopify uses HMAC-SHA256
  shopify: {
    platform: "shopify",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "x-shopify-hmac-sha256",
      headerFormat: "raw",
      timestampHeader: "x-shopify-shop-domain",
      payloadFormat: "raw",
    },
    description: "Shopify webhooks use HMAC-SHA256",
  },

  // Vercel uses HMAC-SHA256
  vercel: {
    platform: "vercel",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "x-vercel-signature",
      headerFormat: "raw",
      timestampHeader: "x-vercel-timestamp",
      timestampFormat: "unix",
      payloadFormat: "raw",
    },
    description: "Vercel webhooks use HMAC-SHA256",
  },

  // Polar uses HMAC-SHA256
  polar: {
    platform: "polar",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "x-polar-signature",
      headerFormat: "raw",
      timestampHeader: "x-polar-timestamp",
      timestampFormat: "unix",
      payloadFormat: "raw",
    },
    description: "Polar webhooks use HMAC-SHA256",
  },

  // Supabase uses simple token-based authentication
  supabase: {
    platform: "supabase",
    signatureConfig: {
      algorithm: "custom",
      headerName: "x-webhook-token",
      headerFormat: "raw",
      payloadFormat: "raw",
      customConfig: {
        type: "token-based",
        idHeader: "x-webhook-id",
      },
    },
    description: "Supabase webhooks use token-based authentication",
  },

  // Custom platform - can be configured per instance
  custom: {
    platform: "custom",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "x-webhook-token",
      headerFormat: "raw",
      payloadFormat: "raw",
    },
    description: "Custom webhook configuration",
  },

  // Unknown platform - fallback
  unknown: {
    platform: "unknown",
    signatureConfig: {
      algorithm: "hmac-sha256",
      headerName: "x-webhook-signature",
      headerFormat: "raw",
      payloadFormat: "raw",
    },
    description: "Unknown platform - using default HMAC-SHA256",
  },
};

// Helper function to get algorithm config for a platform
export function getPlatformAlgorithmConfig(
  platform: WebhookPlatform,
): PlatformAlgorithmConfig {
  return platformAlgorithmConfigs[platform] || platformAlgorithmConfigs.unknown;
}

// Helper function to check if a platform uses a specific algorithm
export function platformUsesAlgorithm(
  platform: WebhookPlatform,
  algorithm: string,
): boolean {
  const config = getPlatformAlgorithmConfig(platform);
  return config.signatureConfig.algorithm === algorithm;
}

// Helper function to get all platforms using a specific algorithm
export function getPlatformsUsingAlgorithm(
  algorithm: string,
): WebhookPlatform[] {
  return Object.entries(platformAlgorithmConfigs)
    .filter(([_, config]) => config.signatureConfig.algorithm === algorithm)
    .map(([platform, _]) => platform as WebhookPlatform);
}

// Helper function to validate signature config
export function validateSignatureConfig(config: SignatureConfig): boolean {
  if (!config.algorithm || !config.headerName) {
    return false;
  }

  // Validate algorithm-specific requirements
  switch (config.algorithm) {
    case "hmac-sha256":
    case "hmac-sha1":
    case "hmac-sha512":
      return true; // These algorithms only need headerName
    case "rsa-sha256":
    case "ed25519":
      return !!config.customConfig?.publicKey; // These need public key
    case "custom":
      return !!config.customConfig; // Custom needs custom config
    default:
      return false;
  }
}
