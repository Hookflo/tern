import { WebhookVerificationService } from '../index';
import { WebhookPlatform } from '../types';
import { QueueOption, QueuedMessage, ResolvedQueueConfig } from './types';

export type HandlerFn = (payload: unknown, metadata: Record<string, unknown>) => Promise<unknown> | unknown;

interface QStashClient {
  publishJSON: (payload: {
    url: string;
    body: QueuedMessage;
    deduplicationId?: string;
    retries?: number;
  }) => Promise<unknown>;
}

interface QStashReceiver {
  verify: (payload: {
    signature: string;
    body: string;
    url?: string;
  }) => Promise<boolean> | boolean;
}

function loadQStashModule(): { Client: new (config: { token: string }) => QStashClient; Receiver: new (config: { currentSigningKey: string; nextSigningKey: string }) => QStashReceiver } {
  try {
    return require('@upstash/qstash');
  } catch {
    throw new Error('[tern] Queue support requires optional peer dependency "@upstash/qstash". Please install it to use queue mode.');
  }
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
      throw new Error('[tern] queue: true requires QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY in env');
    }

    return {
      token,
      signingKey,
      nextSigningKey,
    };
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
    return nonRetryableResponse(verificationResult.error || 'Webhook signature verification failed');
  }

  const { Client } = loadQStashModule();
  const client = new Client({ token: queueConfig.token });

  const queuedMessage: QueuedMessage = {
    platform,
    payload: verificationResult.payload,
    metadata: verificationResult.metadata || {},
  };

  const idempotencyKey = request.headers.get('idempotency-key')
    || request.headers.get('x-webhook-id')
    || undefined;

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
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function handleProcess(
  request: Request,
  handler: HandlerFn | undefined,
  queueConfig: ResolvedQueueConfig,
): Promise<Response> {
  const signature = request.headers.get('upstash-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Upstash-Signature header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await request.text();

  const { Receiver } = loadQStashModule();
  const receiver = new Receiver({
    currentSigningKey: queueConfig.signingKey,
    nextSigningKey: queueConfig.nextSigningKey,
  });

  try {
    const verification = await receiver.verify({
      signature,
      body: rawBody,
      url: request.url,
    });

    if (verification === false) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
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
    return new Response(JSON.stringify({ delivered: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Handler execution failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
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
