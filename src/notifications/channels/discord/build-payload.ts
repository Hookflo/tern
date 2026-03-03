import type { AlertPayloadBuilderInput } from "../../types";
import { compactMetadata } from "../../utils";
import { severityColorMap } from "../../constants";

export function buildDiscordPayload(input: AlertPayloadBuilderInput) {
  const isDLQ = input.dlq;

  const fallbackTitle = isDLQ ? "Dead Letter Queue — Event Failed" : "Webhook Received";
  const title = input.title?.trim() ? input.title : fallbackTitle;

  const fallbackDescription = isDLQ
    ? "Event exhausted all retries. Manual replay required."
    : "Event verified and queued for processing.";
  const description = input.message?.trim() ? input.message : fallbackDescription;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (input.source) {
    fields.push({ name: "Platform", value: input.source, inline: true });
  }

  fields.push({
    name: "Severity",
    value: input.severity.toLowerCase(),
    inline: true,
  });

  if (isDLQ) {
    fields.push({ name: "Queue", value: "dlq", inline: true });
  }

  if (input.eventId) {
    fields.push({
      name: isDLQ ? "DLQ ID" : "Event ID",
      value: `\`${input.eventId}\``,
      inline: false,
    });
  }

  const metadataString = compactMetadata(input.metadata);
  if (metadataString) {
    fields.push({ name: "Details", value: `\`\`\`${metadataString}\`\`\`` });
  }

  const replayLine = input.replayUrl
    ? `\n\n[${input.replayLabel ?? "Replay Event"}](${input.replayUrl})`
    : "";

  const footerText =
    input.branding === false ? undefined : "Alert from Tern · tern.hookflo.com";

  return {
    embeds: [
      {
        title,
        description: `${description}${replayLine}`,
        color: parseInt(severityColorMap[input.severity].replace("#", ""), 16),
        fields,
        footer: footerText ? { text: footerText } : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
