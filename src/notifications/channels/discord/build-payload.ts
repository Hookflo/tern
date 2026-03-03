import type { AlertPayloadBuilderInput } from '../../types';
import { compactMetadata } from '../../utils';
import { severityColorMap } from '../../constants';

export function buildDiscordPayload(input: AlertPayloadBuilderInput) {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: 'Severity',
      value: input.severity.toUpperCase(),
      inline: true,
    },
  ];

  if (input.eventId) {
    fields.push({ name: 'Event ID', value: `\`${input.eventId}\``, inline: true });
  }

  if (input.source) {
    fields.push({ name: 'Source', value: input.source, inline: true });
  }

  if (input.dlq) {
    fields.push({ name: 'Queue', value: 'DLQ', inline: true });
  }

  const metadataString = compactMetadata(input.metadata);
  if (metadataString) {
    fields.push({ name: 'Details', value: `\`\`\`${metadataString}\`\`\`` });
  }

  const replayLine = input.replayUrl ? `\n\n[${input.replayLabel}](${input.replayUrl})` : '';
  const footerText = input.branding === false ? undefined : 'Alert from Tern • tern.hookflo.com';

  return {
    embeds: [
      {
        title: input.title,
        description: `${input.message}${replayLine}`,
        color: parseInt(severityColorMap[input.severity].replace('#', ''), 16),
        fields,
        footer: footerText ? { text: footerText } : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
