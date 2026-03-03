import { normalizeAlertOptions, resolveDestinations } from './utils';
import { buildSlackPayload } from './channels/slack';
import { buildDiscordPayload } from './channels/discord';

export * from './types';

export const notificationInternals = {
  resolveDestinations,
  normalizeAlertOptions,
  buildSlackPayload,
  buildDiscordPayload,
};
