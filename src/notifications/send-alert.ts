import type {
  AlertConfig,
  SendAlertOptions,
  SendAlertResult,
  SendAlertSummary,
} from './types';
import { resolveDestinations, normalizeAlertOptions } from './utils';
import { buildSlackPayload } from './channels/slack';
import { buildDiscordPayload } from './channels/discord';

async function postWebhook(
  webhookUrl: string,
  body: unknown,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Webhook call failed with ${response.status}`,
      };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message,
    };
  }
}

function buildPayload(channel: 'slack' | 'discord', options: SendAlertOptions) {
  const normalized = normalizeAlertOptions(options);
  return channel === 'slack' ? buildSlackPayload(normalized) : buildDiscordPayload(normalized);
}

export async function sendAlert(
  config: AlertConfig,
  options: SendAlertOptions,
): Promise<SendAlertSummary> {
  const destinations = resolveDestinations(config);

  if (destinations.length === 0) {
    return {
      success: false,
      total: 0,
      delivered: 0,
      results: [{
        channel: 'slack',
        webhookUrl: '',
        ok: false,
        error: 'No valid alert webhook destinations configured',
      }],
    };
  }

  const results = await Promise.all(destinations.map(async (destination): Promise<SendAlertResult> => {
    const payload = buildPayload(destination.channel, options);
    const response = await postWebhook(destination.webhookUrl, payload);

    return {
      channel: destination.channel,
      webhookUrl: destination.webhookUrl,
      ok: response.ok,
      status: response.status,
      error: response.error,
    };
  }));

  const delivered = results.filter((result) => result.ok).length;

  return {
    success: delivered === results.length,
    total: results.length,
    delivered,
    results,
  };
}
