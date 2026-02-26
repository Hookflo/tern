import {
  DLQMessage,
  EventFilter,
  ReplayResult,
  TernControlsConfig,
  TernEvent,
} from './types';

const QSTASH_API_BASE = 'https://qstash.upstash.io/v2';

function parseBody(body: unknown): Record<string, unknown> | undefined {
  if (!body) return undefined;

  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      try {
        const decoded = Buffer.from(body, 'base64').toString('utf8');
        return JSON.parse(decoded) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function resolvePlatform(message: Record<string, unknown>): string {
  const headers = message.headers as Record<string, unknown> | undefined;
  const headerPlatform = headers?.['x-tern-platform'] ?? headers?.['X-Tern-Platform'];

  if (typeof headerPlatform === 'string' && headerPlatform.trim().length > 0) {
    return headerPlatform;
  }

  const body = parseBody(message.body);
  const bodyPlatform = body?.platform;

  if (typeof bodyPlatform === 'string' && bodyPlatform.trim().length > 0) {
    return bodyPlatform;
  }

  return 'unknown';
}

function createHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function deriveStatus(value: string): 'delivered' | 'failed' | 'retrying' {
  const lowered = value.toLowerCase();
  if (lowered.includes('deliver')) return 'delivered';
  if (lowered.includes('fail')) return 'failed';
  return 'retrying';
}

export function createTernControls(config: TernControlsConfig) {
  return {
    async dlq(): Promise<DLQMessage[]> {
      const response = await fetch(`${QSTASH_API_BASE}/dlq`, {
        headers: createHeaders(config.token),
      });

      if (!response.ok) {
        throw new Error(`[tern] Failed to fetch DLQ: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { messages?: Array<Record<string, unknown>> };
      const messages = data.messages || [];

      return messages.map((message) => ({
        id: String(message.messageId || message.id || ''),
        dlqId: String(message.dlqId || ''),
        platform: resolvePlatform(message),
        payload: parseBody(message.body)?.payload,
        failedAt: String(message.updatedAt || message.createdAt || new Date().toISOString()),
        attempts: Number(message.retried || message.attempts || 0),
        error: typeof message.error === 'string' ? message.error : undefined,
      }));
    },

    async replay(dlqId: string): Promise<ReplayResult> {
      if (!dlqId || dlqId.trim() === '') {
        throw new Error('[tern] replay() requires a dlqId, not a messageId. Get dlqId from controls.dlq()');
      }

      const response = await fetch(`${QSTASH_API_BASE}/dlq/${dlqId}`, {
        method: 'DELETE',
        headers: createHeaders(config.token),
      });

      if (!response.ok) {
        throw new Error(
          `[tern] Failed to replay DLQ message ${dlqId}: ${response.status} ${response.statusText}`,
        );
      }

      return {
        success: true,
        messageId: dlqId,
        replayedAt: new Date().toISOString(),
      };
    },

    async events(filter: EventFilter = {}): Promise<TernEvent[]> {
      const response = await fetch(`${QSTASH_API_BASE}/messages`, {
        headers: createHeaders(config.token),
      });

      if (!response.ok) {
        throw new Error(`[tern] Failed to fetch events: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { messages?: Array<Record<string, unknown>> };
      const messages = data.messages || [];
      const mapped = messages.map((message) => {
        const status = deriveStatus(String(message.state || message.status || 'retrying'));
        return {
          id: String(message.messageId || message.id || ''),
          platform: resolvePlatform(message),
          status,
          attempts: Number(message.retried || message.attempts || 0),
          createdAt: String(message.createdAt || new Date().toISOString()),
          deliveredAt: message.deliveredAt ? String(message.deliveredAt) : undefined,
        };
      });

      const statusFiltered = filter.status
        ? mapped.filter((event) => event.status === filter.status)
        : mapped;

      return statusFiltered.slice(0, filter.limit ?? 20);
    },
  };
}
