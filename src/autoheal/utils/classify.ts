import { PlatformDocDiff, buildUnifiedDiff } from "./diff";
import { runWithFailover } from "./model";

function cleanJsonOutput(raw: string): string {
  return raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1").trim();
}

export interface ImpactClassification {
  isPotentiallyBreaking: boolean;
  reasons: string[];
  extractedChanges: {
    headersChanged?: boolean;
    algorithmChanged?: boolean;
    payloadFormatChanged?: boolean;
    toleranceChanged?: boolean;
    encodingChanged?: boolean;
    prefixChanged?: boolean;
    idHeaderChanged?: boolean;
    timestampHeaderChanged?: boolean;
  };
  confidence?: number;
}

export async function classifyDiffImpact(
  diff: PlatformDocDiff
): Promise<ImpactClassification> {
  const unified = buildUnifiedDiff(diff.oldContent || "", diff.newContent);
  const prompt = `You are analyzing webhook verification documentation changes.
  [platform] ${diff.platform}
  [url] ${diff.url}

  Annotated diff with unchanged context lines and directives [updated]/[deleted]/[added]:
  \n${unified}\n
  Task: Cross-check the URL if needed for extra context and identify ONLY webhook-verification-impactful changes (signature header name/format/prefix, algorithm, payload format, timestamp/tolerance window, encoding/base64/hex, id/timestamp headers). Respond ONLY as strict JSON with fields:
  - isPotentiallyBreaking: boolean
  - reasons: string[]
  - extractedChanges: { headersChanged?: boolean; algorithmChanged?: boolean; payloadFormatChanged?: boolean; toleranceChanged?: boolean; encodingChanged?: boolean; prefixChanged?: boolean; idHeaderChanged?: boolean; timestampHeaderChanged?: boolean }
  - confidence: number (0..1)`;

  const { text } = await runWithFailover(prompt);
  try {
    let cleaned = cleanJsonOutput(text);
    console.log("[autoheal] cleaned classification output:", cleaned);
    const parsed = JSON.parse(cleaned) as ImpactClassification;
    console.log("[autoheal] parsed classification output:", parsed);
    return parsed;
  } catch {
    return {
      isPotentiallyBreaking: false,
      reasons: ["LLM parsing failed"],
      extractedChanges: {},
    };
  }
}
