import * as QStash from '@upstash/qstash';
import { WebhookVerificationService } from '../index';
import { WebhookPlatform } from '../types';
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

  const idempotencyKey =
    request.headers.get('idempotency-key') ||
    request.headers.get('x-webhook-id') ||
    undefined;

  const publishPayload: {
    url: string;
    body: QueuedMessage;
    deduplicationId?: string;
    retries?: number;
  } = {
    url: request.url,
    body: queuedMessage,
    deduplicationId: idempotencyKey,
  };

  if (queueConfig.retries !== undefined) {
    publishPayload.retries = queueConfig.retries;
  }

  await client.publishJSON(publishPayload);

  return new Response(JSON.stringify({ queued: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
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
