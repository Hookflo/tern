export type WebhookPlatform =
  | 'custom'
  | 'clerk'
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
  | 'unknown';

export enum WebhookPlatformKeys {
  GitHub = 'github',
  Stripe = 'stripe',
  Clerk = 'clerk',
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

export type NormalizationCategory = 'payment' | 'auth' | 'ecommerce' | 'infrastructure';

export interface BaseNormalizedWebhook {
  category: NormalizationCategory;
  event: string;
  _platform: WebhookPlatform | string;
  _raw: unknown;
  occurred_at?: string;
}

export type PaymentWebhookEvent =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'payment.unknown';

export interface PaymentWebhookNormalized extends BaseNormalizedWebhook {
  category: 'payment';
  event: PaymentWebhookEvent;
  amount?: number;
  currency?: string;
  customer_id?: string;
  transaction_id?: string;
  subscription_id?: string;
  refund_amount?: number;
  failure_reason?: string;
  metadata?: Record<string, string>;
}

export type AuthWebhookEvent =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.started'
  | 'session.ended'
  | 'auth.unknown';

export interface AuthWebhookNormalized extends BaseNormalizedWebhook {
  category: 'auth';
  event: AuthWebhookEvent;
  user_id?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface EcommerceWebhookNormalized extends BaseNormalizedWebhook {
  category: 'ecommerce';
  event: string;
  order_id?: string;
  customer_id?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface InfrastructureWebhookNormalized extends BaseNormalizedWebhook {
  category: 'infrastructure';
  event: string;
  project_id?: string;
  deployment_id?: string;
  status?: 'queued' | 'building' | 'ready' | 'error' | 'unknown';
  metadata?: Record<string, string>;
}

export interface UnknownNormalizedWebhook extends BaseNormalizedWebhook {
  event: string;
  warning?: string;
}

export type NormalizedPayloadByCategory = {
  payment: PaymentWebhookNormalized;
  auth: AuthWebhookNormalized;
  ecommerce: EcommerceWebhookNormalized;
  infrastructure: InfrastructureWebhookNormalized;
};

export type AnyNormalizedWebhook =
  | PaymentWebhookNormalized
  | AuthWebhookNormalized
  | EcommerceWebhookNormalized
  | InfrastructureWebhookNormalized
  | UnknownNormalizedWebhook;

export interface NormalizeOptions {
  enabled?: boolean;
  category?: NormalizationCategory;
  includeRaw?: boolean;
}

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
  // Optional payload normalization
  normalize?: boolean | NormalizeOptions;
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
