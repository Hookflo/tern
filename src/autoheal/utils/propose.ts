import fs from "node:fs/promises";
import path from "node:path";
import { PlatformDocDiff, buildUnifiedDiff } from "./diff";
import { ImpactClassification } from "./classify";
import { runWithFailover } from "./model";

export interface ProposedEdit {
  filePath: string;
  description: string;
  diff: string;
}

function getRepoRoot(): string {
  return process.cwd();
}

export async function proposeCodeEdits(
  diff: PlatformDocDiff,
  impact: ImpactClassification
): Promise<ProposedEdit[]> {
  const root = getRepoRoot();
  const targetFile = path.join(root, "src", "platforms", "algorithms.ts");
  const currentFile = await fs.readFile(targetFile, "utf8");

  const unified = buildUnifiedDiff(diff.oldContent || "", diff.newContent);
  const prompt = `You are an expert TypeScript engineer maintaining a webhook verification config map at src/platforms/algorithms.ts.
Platform: ${diff.platform}
URL: ${diff.url}

Based on the annotated doc diff below, propose a minimal, correct edit to that file only.
Provide a unified diff (git style) with exact context from the current file content below. Do not invent unrelated changes. Only modify the relevant platform's SignatureConfig.

Current file content:\n${currentFile.slice(0, 8000)}

Annotated doc diff with unchanged context lines and directives [updated]/[deleted]/[added]:\n${unified}

Output strictly as unified diff starting with --- and +++ lines.`;

  const { text } = await runWithFailover(prompt);

  return [
    {
      filePath: "src/platforms/algorithms.ts",
      description: `Update ${diff.platform} signature config based on docs changes`,
      diff: text,
    },
  ];
}
