import { WebhookPlatform } from '../types';
import type { SendAlertOptions, SendAlertSummary } from '../notifications/types';

export type QueueOption =
  | true
  | {
      token: string
      signingKey: string
      nextSigningKey: string
      retries?: number
    };

export interface ResolvedQueueConfig {
  token: string;
  signingKey: string;
  nextSigningKey: string;
  retries?: number;
}

export interface TernControlsConfig {
  token: string;
  notifications?: {
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
  };
}

export interface DLQMessage {
  id: string;
  dlqId: string;
  platform: string;
  payload: unknown;
  failedAt: string;
  attempts: number;
  error?: string;
}

export interface ReplayResult {
  success: boolean;
  messageId: string;
  replayedAt: string;
}

export interface EventFilter {
  status?: 'delivered' | 'failed' | 'retrying';
  limit?: number;
}

export interface TernEvent {
  id: string;
  platform: string;
  status: 'delivered' | 'failed' | 'retrying';
  attempts: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface QueuedMessage {
  platform: WebhookPlatform;
  payload: unknown;
  metadata: Record<string, unknown>;
}

export type ControlAlertOptions =
  | (SendAlertOptions & {
      dlq: true;
      dlqId: string;
    })
  | (SendAlertOptions & {
      dlq?: false;
      dlqId?: never;
    });

export interface TernControls {
  dlq: () => Promise<DLQMessage[]>;
  replay: (dlqId: string) => Promise<ReplayResult>;
  events: (filter?: EventFilter) => Promise<TernEvent[]>;
  alert: (options?: ControlAlertOptions) => Promise<SendAlertSummary>;
}
