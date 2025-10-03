export type WebhookPlatform =
  | 'custom'
  | 'clerk'
  | 'supabase'
  | 'github'
  | 'stripe'
  | 'shopify'
  | 'vercel'
  | 'polar'
  | 'dodopayments'
  | 'gitlab'
  | 'unknown';

export enum WebhookPlatformKeys {
  GitHub = 'github',
  Stripe = 'stripe',
  Clerk = 'clerk',
  DodoPayments = 'dodopayments',
  Shopify = 'shopify',
  Vercel = 'vercel',
  Polar = 'polar',
  Supabase = 'supabase',
  GitLab = 'gitlab',
  Custom ='custom',
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
  payloadFormat?: 'raw' | 'timestamped' | 'custom';
  customConfig?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  platform: WebhookPlatform;
  payload?: any;
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
}

// New interface for platform algorithm mapping
export interface PlatformAlgorithmConfig {
  platform: WebhookPlatform;
  signatureConfig: SignatureConfig;
  description?: string;
}

// Interface for simple token-based authentication (like Supabase)
export interface TokenAuthConfig {
  webhookId: string;
  webhookToken: string;
}
