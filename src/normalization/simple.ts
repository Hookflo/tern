import {
  AnyNormalizedWebhook,
  NormalizeOptions,
  NormalizationCategory,
  WebhookPlatform,
  PaymentWebhookNormalized,
  AuthWebhookNormalized,
  InfrastructureWebhookNormalized,
  UnknownNormalizedWebhook,
} from '../types';

type PlatformNormalizationFn<TPayload extends AnyNormalizedWebhook> = (payload: any) => Omit<TPayload, '_raw' | '_platform'>;

interface PlatformNormalizationSpec<TPayload extends AnyNormalizedWebhook> {
  platform: WebhookPlatform;
  category: NormalizationCategory;
  normalize: PlatformNormalizationFn<TPayload>;
}

function readPath(payload: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[key];
  }, payload as any);
}

const platformNormalizers: Partial<Record<WebhookPlatform, PlatformNormalizationSpec<any>>> = {
  stripe: {
    platform: 'stripe',
    category: 'payment',
    normalize: (payload): Omit<PaymentWebhookNormalized, '_raw' | '_platform'> => ({
      category: 'payment',
      event: readPath(payload, 'type') === 'payment_intent.succeeded'
        ? 'payment.succeeded'
        : 'payment.unknown',
      amount: readPath(payload, 'data.object.amount_received')
        ?? readPath(payload, 'data.object.amount'),
      currency: String(readPath(payload, 'data.object.currency') ?? '').toUpperCase() || undefined,
      customer_id: readPath(payload, 'data.object.customer'),
      transaction_id: readPath(payload, 'data.object.id'),
      metadata: {},
      occurred_at: new Date().toISOString(),
    }),
  },
  polar: {
    platform: 'polar',
    category: 'payment',
    normalize: (payload): Omit<PaymentWebhookNormalized, '_raw' | '_platform'> => ({
      category: 'payment',
      event: readPath(payload, 'event') === 'payment.completed'
        ? 'payment.succeeded'
        : 'payment.unknown',
      amount: readPath(payload, 'payload.amount_cents'),
      currency: String(readPath(payload, 'payload.currency_code') ?? '').toUpperCase() || undefined,
      customer_id: readPath(payload, 'payload.customer_id'),
      transaction_id: readPath(payload, 'payload.transaction_id'),
      metadata: {},
      occurred_at: new Date().toISOString(),
    }),
  },
  clerk: {
    platform: 'clerk',
    category: 'auth',
    normalize: (payload): Omit<AuthWebhookNormalized, '_raw' | '_platform'> => ({
      category: 'auth',
      event: readPath(payload, 'type') || 'auth.unknown',
      user_id: readPath(payload, 'data.id'),
      email: readPath(payload, 'data.email_addresses.0.email_address'),
      metadata: {},
      occurred_at: new Date().toISOString(),
    }),
  },
  supabase: {
    platform: 'supabase',
    category: 'auth',
    normalize: (payload): Omit<AuthWebhookNormalized, '_raw' | '_platform'> => ({
      category: 'auth',
      event: readPath(payload, 'type') || readPath(payload, 'event') || 'auth.unknown',
      user_id: readPath(payload, 'record.id') || readPath(payload, 'id'),
      email: readPath(payload, 'record.email') || readPath(payload, 'email'),
      metadata: {},
      occurred_at: new Date().toISOString(),
    }),
  },
  vercel: {
    platform: 'vercel',
    category: 'infrastructure',
    normalize: (payload): Omit<InfrastructureWebhookNormalized, '_raw' | '_platform'> => ({
      category: 'infrastructure',
      event: readPath(payload, 'type') || 'deployment.unknown',
      project_id: readPath(payload, 'payload.project.id'),
      deployment_id: readPath(payload, 'payload.deployment.id'),
      status: 'unknown',
      metadata: {},
      occurred_at: new Date().toISOString(),
    }),
  },
};

export function getPlatformNormalizationCategory(platform: WebhookPlatform): NormalizationCategory | null {
  return platformNormalizers[platform]?.category || null;
}

export function getPlatformsByCategory(category: NormalizationCategory): WebhookPlatform[] {
  return Object.values(platformNormalizers)
    .filter((spec): spec is PlatformNormalizationSpec<any> => !!spec)
    .filter((spec) => spec.category === category)
    .map((spec) => spec.platform);
}

interface ResolvedNormalizeOptions {
  enabled: boolean;
  category?: NormalizationCategory;
  includeRaw: boolean;
}

function resolveNormalizeOptions(normalize?: boolean | NormalizeOptions): ResolvedNormalizeOptions {
  if (typeof normalize === 'boolean') {
    return {
      enabled: normalize,
      category: undefined,
      includeRaw: true,
    };
  }

  return {
    enabled: normalize?.enabled ?? true,
    category: normalize?.category,
    includeRaw: normalize?.includeRaw ?? true,
  };
}

function buildUnknownNormalizedPayload(
  platform: WebhookPlatform,
  payload: any,
  category: NormalizationCategory | undefined,
  includeRaw: boolean,
  warning?: string,
): UnknownNormalizedWebhook {
  return {
    category: category || 'infrastructure',
    event: payload?.type ?? payload?.event ?? 'unknown',
    _platform: platform,
    _raw: includeRaw ? payload : undefined,
    warning,
    occurred_at: new Date().toISOString(),
  };
}

export function normalizePayload(
  platform: WebhookPlatform,
  payload: any,
  normalize?: boolean | NormalizeOptions,
): AnyNormalizedWebhook | unknown {
  const options = resolveNormalizeOptions(normalize);
  if (!options.enabled) {
    return payload;
  }

  const spec = platformNormalizers[platform];
  const inferredCategory = spec?.category;

  if (!spec) {
    return buildUnknownNormalizedPayload(platform, payload, options.category, options.includeRaw);
  }

  if (options.category && options.category !== inferredCategory) {
    return buildUnknownNormalizedPayload(
      platform,
      payload,
      inferredCategory,
      options.includeRaw,
      `Requested normalization category '${options.category}' does not match platform category '${inferredCategory}'`,
    );
  }

  const normalized = spec.normalize(payload);

  return {
    ...normalized,
    _platform: platform,
    _raw: options.includeRaw ? payload : undefined,
  } as AnyNormalizedWebhook;
}
