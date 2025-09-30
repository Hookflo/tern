import { fetchAndRotateDocs, type PlatformDocDiff } from "./sources";
import { buildUnifiedDiff } from "./utils/diff";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureEnvLoaded } from "./utils/env";
import {
  classifyDiffImpact,
  type ImpactClassification,
} from "./utils/classify";
import { proposeCodeEdits, type ProposedEdit } from "./utils/propose";
import { createPullRequest, createIssueOnBreakingChange } from "./utils/github";
import { platformManager } from "../platforms/manager";

async function main() {
  ensureEnvLoaded();
  const runId = new Date().toISOString();
  const minConfidence = Number(process.env.LLM_MIN_CONFIDENCE || 0.7);
  const githubToken = process.env.GITHUB_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const LLMApiKey =
    process.env.GROQ_API_KEY || process.env.COHERE_API_KEY || "";

  if (!LLMApiKey) {
    throw new Error("Missing ROQ_API_KEY or OPENAI_API_KEY");
  }

  const diffs: PlatformDocDiff[] = await fetchAndRotateDocs();

  const impactful: Array<{
    diff: PlatformDocDiff;
    impact: ImpactClassification;
    proposals: ProposedEdit[];
  }> = [];

  for (const diff of diffs) {
    const unified = buildUnifiedDiff(diff.oldContent || "", diff.newContent);
    const dir = path.join(process.cwd(), ".autoheal", diff.platform);
    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(dir, `diff-${stamp}.txt`), unified, "utf8");

    // try {
    //   const impact = await classifyDiffImpact(diff);
    //   console.log("[autoheal] impact classification:", impact);
    //   if (
    //     impact.isPotentiallyBreaking &&
    //     (impact as any).confidence >= minConfidence
    //   ) {
    //     const proposals = await proposeCodeEdits(diff, impact);
    //     impactful.push({ diff, impact, proposals });
    //     if (githubToken && repo) {
    //       await createIssueOnBreakingChange({
    //         repoFullName: repo,
    //         token: githubToken,
    //         platform: diff.platform,
    //         url: diff.url,
    //         reasons: impact.reasons || ["breaking change detected"],
    //       });
    //     }
    //   }
    // } catch (e) {
    //   // eslint-disable-next-line no-console
    //   console.warn("[autoheal] classification error:", e);
    // }
  }

  if (impactful.length === 0) {
    console.log("[autoheal] No impactful changes detected");
    return;
  }

  // Run platform tests to ensure changes don't break existing functionality
  console.log("[autoheal] Running platform tests after changes...");
  try {
    const allTestsPassed = await platformManager.runAllTests();
    if (!allTestsPassed) {
      console.warn("[autoheal] Some platform tests failed after changes");
    } else {
      console.log("[autoheal] All platform tests passed");
    }
  } catch (error) {
    console.error("[autoheal] Error running platform tests:", error);
  }

  // Create pull request if changes are detected
  if (githubToken && repo) {
    await createPullRequest({
      repoFullName: repo,
      token: githubToken,
      runId,
      proposalsByPlatform: impactful,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[autoheal] run failed:", err);
  process.exit(1);
});
