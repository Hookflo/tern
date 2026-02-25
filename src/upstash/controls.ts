import {
  DLQMessage,
  EventFilter,
  ReplayResult,
  TernControlsConfig,
  TernEvent,
} from './types';

const QSTASH_API_BASE = 'https://qstash.upstash.io/v2';

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
        throw new Error(`[tern] Failed to fetch DLQ messages: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { messages?: Array<Record<string, unknown>> };
      const messages = data.messages || [];

      return messages.map((message) => ({
        id: String(message.messageId || message.id || ''),
        platform: String(message.body && typeof message.body === 'object' ? (message.body as Record<string, unknown>).platform || 'unknown' : 'unknown'),
        payload: message.body && typeof message.body === 'object' ? (message.body as Record<string, unknown>).payload : undefined,
        failedAt: String(message.updatedAt || message.createdAt || new Date().toISOString()),
        attempts: Number(message.retried || message.attempts || 0),
        error: typeof message.error === 'string' ? message.error : undefined,
      }));
    },

    async replay(messageId: string): Promise<ReplayResult> {
      const response = await fetch(`${QSTASH_API_BASE}/dlq/${messageId}`, {
        method: 'POST',
        headers: createHeaders(config.token),
      });

      if (!response.ok) {
        throw new Error(`[tern] Failed to replay DLQ message ${messageId}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      return {
        success: true,
        messageId: String(data.messageId || messageId),
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
          platform: String(message.body && typeof message.body === 'object' ? (message.body as Record<string, unknown>).platform || 'unknown' : 'unknown'),
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
