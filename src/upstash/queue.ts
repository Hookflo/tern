import * as QStash from '@upstash/qstash';
import { WebhookVerificationService } from '../index';
import { WebhookPlatform, WebhookVerificationResult } from '../types';
import { QueueOption, QueuedMessage, ResolvedQueueConfig } from './types';

export type HandlerFn = (payload: unknown, metadata: Record<string, unknown>) => Promise<unknown> | unknown;

type QStashReceiverInstance = {
  verify: (input: { signature: string; body: string; url?: string }) => Promise<boolean>;
};

type QStashClientInstance = {
  publishJSON: (payload: {
    url: string;
    body: QueuedMessage;
    deduplicationId?: string;
    headers?: Record<string, string>;
    retries?: number;
  }) => Promise<unknown>;
};

type QStashModuleShape = {
  Receiver?: unknown;
  Client?: unknown;
  default?: {
    Receiver?: unknown;
    Client?: unknown;
  };
};

async function dynamicImport(modulePath: string): Promise<unknown> {
  return new Function('modulePath', 'return import(modulePath);')(modulePath) as Promise<unknown>;
}

async function loadQStashModules(): Promise<QStashModuleShape[]> {
  const optionalImports = await Promise.allSettled([
    dynamicImport('@upstash/qstash'),
    dynamicImport('@upstash/qstash/nextjs'),
    dynamicImport('@upstash/qstash/nuxt'),
    dynamicImport('@upstash/qstash/sveltekit'),
    dynamicImport('@upstash/qstash/cloudflare'),
  ]);

  return [
    QStash as QStashModuleShape,
    ...optionalImports.flatMap((result) => (result.status === 'fulfilled' ? [result.value as QStashModuleShape] : [])),
  ];
}

function resolveModuleExport<T>(modules: QStashModuleShape[], key: 'Receiver' | 'Client'): T | undefined {
  for (const moduleRef of modules) {
    const directExport = moduleRef[key];
    if (typeof directExport === 'function') {
      return directExport as T;
    }

    const defaultExport = moduleRef.default?.[key];
    if (typeof defaultExport === 'function') {
      return defaultExport as T;
    }
  }

  return undefined;
}

function resolveNestedConstructor<T>(modules: QStashModuleShape[], key: 'Receiver' | 'Client'): T | undefined {
  const seen = new Set<unknown>();
  const queue: unknown[] = [...modules];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) {
      continue;
    }

    seen.add(current);
    const record = current as Record<string, unknown>;
    const candidate = record[key];
    if (typeof candidate === 'function') {
      return candidate as T;
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return undefined;
}

async function createQStashReceiver(queueConfig: ResolvedQueueConfig): Promise<QStashReceiverInstance> {
  const modules = await loadQStashModules();
  const receiverExport = resolveModuleExport<new (args: {
    currentSigningKey: string;
    nextSigningKey: string;
  }) => QStashReceiverInstance>(modules, 'Receiver')
    ?? resolveNestedConstructor<new (args: {
      currentSigningKey: string;
      nextSigningKey: string;
    }) => QStashReceiverInstance>(modules, 'Receiver');

  if (typeof receiverExport !== 'function') {
    throw new Error(
      '[tern] Incompatible @upstash/qstash version: Receiver export not found. Ensure @upstash/qstash is installed and up-to-date.',
    );
  }

  return new receiverExport({
    currentSigningKey: queueConfig.signingKey,
    nextSigningKey: queueConfig.nextSigningKey,
  });
}

async function createQStashClient(queueConfig: ResolvedQueueConfig): Promise<QStashClientInstance> {
  const modules = await loadQStashModules();
  const clientExport = resolveModuleExport<new (args: { token: string }) => QStashClientInstance>(modules, 'Client');
  const resolvedClientExport = clientExport
    ?? resolveNestedConstructor<new (args: { token: string }) => QStashClientInstance>(modules, 'Client');

  if (typeof resolvedClientExport !== 'function') {
    throw new Error(
      '[tern] Incompatible @upstash/qstash version: Client export not found. Ensure @upstash/qstash is installed and up-to-date.',
    );
  }

  return new resolvedClientExport({ token: queueConfig.token });
}

function nonRetryableResponse(message: string, status: number = 489): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Upstash-NonRetryable-Error': 'true',
    },
  });
}

export function resolveQueueConfig(queue: QueueOption): ResolvedQueueConfig {
  if (queue === true) {
    const token = process.env.QSTASH_TOKEN;
    const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!token || !signingKey || !nextSigningKey) {
      throw new Error(
        '[tern] queue: true requires QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY in env',
      );
    }

    return { token, signingKey, nextSigningKey };
  }

  return queue;
}

function toStableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => toStableJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${toStableJson(nested)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

async function resolveDeduplicationId(
  request: Request,
  verificationResult: WebhookVerificationResult,
): Promise<string> {
  const payload = verificationResult.payload as Record<string, unknown> | undefined;
  const headers = request.headers;

  const payloadId = typeof payload?.id === 'string' ? payload.id : null;
  const payloadRequestId = typeof payload?.request_id === 'string' ? payload.request_id : null;
  const nestedPayloadId = payload?.data && typeof payload.data === 'object' && typeof (payload.data as Record<string, unknown>).id === 'string'
    ? (payload.data as Record<string, unknown>).id as string
    : null;

  const explicit =
    headers.get('x-webhook-id') ||
    headers.get('x-github-delivery') ||
    headers.get('idempotency-key') ||
    headers.get('upstash-deduplication-id') ||
    verificationResult.eventId ||
    (typeof verificationResult.metadata?.id === 'string' ? verificationResult.metadata.id : null) ||
    payloadId ||
    payloadRequestId ||
    nestedPayloadId;

  if (explicit) return explicit;

  const raw = toStableJson(payload || {});
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return hash.slice(0, 32);
}

export async function handleReceive(
  request: Request,
  platform: WebhookPlatform,
  secret: string,
  queueConfig: ResolvedQueueConfig,
  toleranceInSeconds: number,
): Promise<Response> {
  const verificationResult = await WebhookVerificationService.verifyWithPlatformConfig(
    request.clone(),
    platform,
    secret,
    toleranceInSeconds,
  );

  if (!verificationResult.isValid) {
    return nonRetryableResponse(
      verificationResult.error || 'Webhook signature verification failed',
    );
  }

  const client = await createQStashClient(queueConfig);

  const queuedMessage: QueuedMessage = {
    platform,
    payload: verificationResult.payload,
    metadata: verificationResult.metadata || {},
  };

  const deduplicationId = await resolveDeduplicationId(request, verificationResult);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[tern] deduplication-id: ${deduplicationId} (platform: ${platform})`);
  }

  const publishPayload: {
    url: string;
    body: QueuedMessage;
    deduplicationId: string;
    headers: Record<string, string>;
    retries?: number;
  } = {
    url: request.url,
    body: queuedMessage,
    deduplicationId,
    headers: {
      'x-tern-platform': platform,
    },
  };

  if (queueConfig.retries !== undefined) {
    publishPayload.retries = queueConfig.retries;
  }

  try {
    await client.publishJSON(publishPayload);
    return new Response(JSON.stringify({ queued: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const status = (error as any)?.status ?? 0;
    const errorBody = (error as any)?.body
      ? (() => {
        try {
          return JSON.parse((error as any).body);
        } catch {
          return {};
        }
      })()
      : {};

    console.error('[tern] QStash publish failed:', {
      status,
      message: String(error),
    });

    if (status === 400) {
      return new Response(
        JSON.stringify({
          error: 'Invalid payload — could not enqueue',
          detail: errorBody?.error,
        }),
        {
          status: 489,
          headers: {
            'Content-Type': 'application/json',
            'Upstash-NonRetryable-Error': 'true',
          },
        },
      );
    }

    if (status === 401) {
      return new Response(
        JSON.stringify({
          error: '[tern] QStash token invalid — check QSTASH_TOKEN in env',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (status === 429) {
      return new Response(
        JSON.stringify({ error: 'QStash rate limited — retry shortly' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Queue temporarily unavailable' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function handleProcess(
  request: Request,
  handler: HandlerFn | undefined,
  queueConfig: ResolvedQueueConfig,
): Promise<Response> {
  const signature = request.headers.get('upstash-signature');
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing Upstash-Signature header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const rawBody = await request.text();

  const receiver = await createQStashReceiver(queueConfig);

  try {
    const verification = await receiver.verify({
      signature,
      body: rawBody,
      url: request.url,
    });

    if (verification === false) {
      return nonRetryableResponse('Invalid QStash signature', 401);
    }
  } catch (error) {
    const message = String(error).toLowerCase();

    if (
      message.includes('invalid') ||
      message.includes('signature') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return nonRetryableResponse('Invalid QStash signature', 401);
    }

    console.error('[tern] QStash signature verification error:', String(error));
    return new Response(
      JSON.stringify({ error: 'Signature verification temporarily unavailable' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (!handler) {
    return nonRetryableResponse('Queue processing requires a handler function');
  }

  let parsedBody: QueuedMessage;
  try {
    parsedBody = JSON.parse(rawBody) as QueuedMessage;
  } catch {
    return nonRetryableResponse('Queued payload is not valid JSON');
  }

  try {
    await handler(parsedBody.payload, parsedBody.metadata || {});
    return new Response(
      JSON.stringify({ delivered: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Handler execution failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function handleQueuedRequest(
  request: Request,
  options: {
    platform: WebhookPlatform;
    secret: string;
    queueConfig: ResolvedQueueConfig;
    handler?: HandlerFn;
    toleranceInSeconds: number;
  },
): Promise<Response> {
  if (request.headers.has('upstash-signature')) {
    return handleProcess(request, options.handler, options.queueConfig);
  }

  return handleReceive(
    request,
    options.platform,
    options.secret,
    options.queueConfig,
    options.toleranceInSeconds,
  );
}
