export * from './types';

import { normalizeAlertOptions, resolveDestinations } from './utils';
import { buildSlackPayload } from './channels/slack';
import { buildDiscordPayload } from './channels/discord';

export const __notificationInternals = {
  resolveDestinations,
  normalizeAlertOptions,
  buildSlackPayload,
  buildDiscordPayload,
};
