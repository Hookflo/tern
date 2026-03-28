import { normalizeAlertOptions, resolveDestinations } from './utils';
import { buildSlackPayload } from './channels/slack';
import { buildDiscordPayload } from './channels/discord';

export * from './types';
export { sendAlert } from './send-alert';
export { dispatchWebhookAlert, type DispatchWebhookAlertInput } from './dispatch';

export const notificationInternals = {
  resolveDestinations,
  normalizeAlertOptions,
  buildSlackPayload,
  buildDiscordPayload,
};
