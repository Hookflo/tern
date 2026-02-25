import { WebhookPlatform } from '../types';

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
}

export interface DLQMessage {
  id: string;
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
