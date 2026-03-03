import type { AlertPayloadBuilderInput } from "../../types";
import { compactMetadata } from "../../utils";
import { TERN_BRAND_URL } from "../../constants";

export function buildSlackPayload(input: AlertPayloadBuilderInput) {
  const isDLQ = input.dlq;

  const fallbackTitle = isDLQ ? "Dead Letter Queue — Event Failed" : "Webhook Received";
  const title = input.title?.trim() ? input.title : fallbackTitle;

  const fallbackMessage = isDLQ
    ? "Event exhausted all retries. Manual replay required."
    : "Event verified and queued for processing.";
  const message = input.message?.trim() ? input.message : fallbackMessage;

  const fields = [
    input.source
      ? { type: "mrkdwn", text: `*Platform*\n${input.source}` }
      : null,
    {
      type: "mrkdwn",
      text: `*Severity*\n${input.severity.toLowerCase()}`,
    },
    isDLQ ? { type: "mrkdwn", text: "*Queue*\ndlq" } : null,
    input.eventId
      ? {
          type: "mrkdwn",
          text: `*${isDLQ ? "DLQ ID" : "Event ID"}*\n\`${input.eventId}\``,
        }
      : null,
  ].filter(Boolean);

  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${title}*\n${message}`,
      },
      fields,
    },
  ];

  const metadataString = compactMetadata(input.metadata);
  if (metadataString) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\`\`\`${metadataString}\`\`\``,
      },
    });
  }

  if (input.replayUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: input.replayLabel ?? "Replay Event",
            emoji: false,
          },
          url: input.replayUrl,
          style: "danger",
        },
      ],
    });
  }

  if (input.branding !== false) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Alert from <${TERN_BRAND_URL}|Tern>`,
        },
      ],
    });
  }

  return {
    text: title,
    blocks,
  };
}
