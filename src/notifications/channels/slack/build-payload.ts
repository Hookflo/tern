import type { AlertPayloadBuilderInput } from '../../types';
import { compactMetadata } from '../../utils';
import { TERN_BRAND_URL } from '../../constants';

export function buildSlackPayload(input: AlertPayloadBuilderInput) {
  const fields = [
    input.eventId ? { type: 'mrkdwn', text: `*Event ID*\n\`${input.eventId}\`` } : null,
    input.source ? { type: 'mrkdwn', text: `*Source*\n${input.source}` } : null,
    {
      type: 'mrkdwn',
      text: `*Severity*\n${input.severity.toUpperCase()}`,
    },
    input.dlq ? { type: 'mrkdwn', text: '*Queue*\nDLQ' } : null,
  ].filter(Boolean);

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: input.title,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: input.message,
      },
      fields,
    },
  ];

  const metadataString = compactMetadata(input.metadata);
  if (metadataString) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Details*\n\`\`\`${metadataString}\`\`\``,
      },
    });
  }

  if (input.replayUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: input.replayLabel,
            emoji: true,
          },
          url: input.replayUrl,
          style: 'primary',
        },
      ],
    });
  }

  if (input.branding !== false) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Alert from <${TERN_BRAND_URL}|Tern>`,
        },
      ],
    });
  }

  return {
    text: `${input.title} - ${input.message}`,
    blocks,
  };
}
