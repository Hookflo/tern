export type WebhookPlatform =
  | 'custom'
  | 'clerk'
  | 'svix'
  | 'github'
  | 'stripe'
  | 'shopify'
  | 'vercel'
  | 'polar'
  | 'dodopayments'
  | 'gitlab'
  | 'paddle'
  | 'razorpay'
  | 'lemonsqueezy'
  | 'workos'
  | 'woocommerce'
  | 'replicateai'
  | 'falai'
  | 'sentry'
  | 'grafana'
  | 'doppler'
  | 'sanity'
  | 'linear'
  | 'pagerduty'
  | 'twilio'
  | 'unknown';

export enum WebhookPlatformKeys {
  GitHub = 'github',
  Stripe = 'stripe',
  Clerk = 'clerk',
  Svix = 'svix',
  DodoPayments = 'dodopayments',
  Shopify = 'shopify',
  Vercel = 'vercel',
  Polar = 'polar',
  GitLab = 'gitlab',
  Paddle = 'paddle',
  Razorpay = 'razorpay',
  LemonSqueezy = 'lemonsqueezy',
  WorkOS = 'workos',
  WooCommerce = 'woocommerce',
  ReplicateAI = 'replicateai',
  FalAI = 'falai',
  Sentry = 'sentry',
  Grafana = 'grafana',
  Doppler = 'doppler',
  Sanity = 'sanity',
  Linear = 'linear',
  PagerDuty = 'pagerduty',
  Twilio = 'twilio',
  Custom = 'custom',
  Unknown = 'unknown'
}

// Algorithm types for the scalable framework
export type SignatureAlgorithm =
  | 'hmac-sha256'
  | 'hmac-sha1'
  | 'hmac-sha512'
  | 'rsa-sha256'
  | 'ed25519'
  | 'custom';

export interface SignatureConfig {
  algorithm: SignatureAlgorithm;
  headerName: string;
  headerFormat?: 'raw' | 'prefixed' | 'comma-separated';
  prefix?: string; // e.g., "sha256=" for GitHub
  timestampHeader?: string;
  timestampFormat?: 'unix' | 'iso' | 'custom';
  payloadFormat?: 'raw' | 'timestamped' | 'json-stringified' | 'custom';
  idHeader?: string;
  customConfig?: Record<string, any>;
}

export type WebhookErrorCode =
  | 'MISSING_SIGNATURE'
  | 'INVALID_SIGNATURE'
  | 'TIMESTAMP_EXPIRED'
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'PLATFORM_NOT_SUPPORTED'
  | 'NORMALIZATION_ERROR'
  | 'VERIFICATION_ERROR';

export interface WebhookVerificationResult<TPayload = unknown> {
  isValid: boolean;
  error?: string;
  errorCode?: WebhookErrorCode;
  platform: WebhookPlatform;
  payload?: TPayload;
  eventId?: string;
  metadata?: {
    timestamp?: string;
    id?: string | null;
    [key: string]: any;
  };
}

export interface WebhookConfig {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  // New fields for algorithm-based verification
  signatureConfig?: SignatureConfig;
  // Optional override for Twilio signature URL construction (useful behind proxies/CDNs)
  twilioBaseUrl?: string;
}

export interface MultiPlatformSecrets {
  [platform: string]: string | undefined;
}

// New interface for platform algorithm mapping
export interface PlatformAlgorithmConfig {
  platform: WebhookPlatform;
  signatureConfig: SignatureConfig;
  description?: string;
}

// Interface for simple token-based authentication
export interface TokenAuthConfig {
  webhookId: string;
  webhookToken: string;
}
