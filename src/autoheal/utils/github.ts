import { Octokit } from '@octokit/rest';
import fs from 'node:fs/promises';
import path from 'node:path';

interface CreatePRArgs {
  repoFullName: string;
  token: string;
  runId: string;
  proposalsByPlatform: Array<{
    diff: { platform: string; url: string };
    impact: { reasons: string[] };
    proposals: Array<{ filePath: string; description: string; diff: string }>;
  }>;
}

export async function createPullRequest(args: CreatePRArgs): Promise<void> {
  const { repoFullName, token, runId, proposalsByPlatform } = args;
  const [owner, repo] = repoFullName.split('/');
  const octokit = new Octokit({ auth: token });

  const base = 'main';
  const branch = `autoheal/11`;

  const baseRef = await octokit.git.getRef({ owner, repo, ref: `heads/${base}` });
  const baseSha = baseRef.data.object.sha;
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });

  const changesReport: string[] = [];
  for (const item of proposalsByPlatform) {
    changesReport.push(`Platform: ${item.diff.platform}\nReasons: ${item.impact.reasons.join('; ')}`);
    for (const p of item.proposals) {
      changesReport.push(`File: ${p.filePath}\n---\n${p.diff}\n`);
    }
  }

  const reportContent = changesReport.join('\n\n');
  const localReportPath = path.join(process.cwd(), '.autoheal', `report-${runId}.md`);
  await fs.mkdir(path.dirname(localReportPath), { recursive: true });
  await fs.writeFile(localReportPath, reportContent, 'utf8');

  const reportPath = `.autoheal/report-${runId}.md`;
  const { data: latestCommit } = await octokit.repos.getContent({ owner, repo, path: '' }).catch(() => ({ data: null as any }));
  const { data: blob } = await octokit.git.createBlob({ owner, repo, content: Buffer.from(reportContent).toString('base64'), encoding: 'base64' });
  const { data: baseCommit } = await octokit.repos.getCommit({ owner, repo, ref: baseSha });
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.commit.tree.sha,
    tree: [
      { path: reportPath, mode: '100644', type: 'blob', sha: blob.sha },
    ],
  });

  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `autoheal: doc diffs and proposed edits (${runId})`,
    tree: tree.sha,
    parents: [baseSha],
  });

  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.sha, force: true });

  await octokit.pulls.create({
    owner,
    repo,
    title: `Autoheal: proposed webhook adjustments (${runId})`,
    head: branch,
    base,
    body: `This PR contains a report of detected webhook doc changes and proposed edits.\n\nSee ${reportPath}.`,
  });
}

export async function createIssueOnBreakingChange(args: {
  repoFullName: string;
  token: string;
  platform: string;
  url: string;
  reasons: string[];
}): Promise<void> {
  const { repoFullName, token, platform, url, reasons } = args;
  const [owner, repo] = repoFullName.split('/');
  const octokit = new Octokit({ auth: token });

  const title = `[autoheal] ${platform}: webhook verification change detected`;
  const body = `Platform: ${platform}\nURL: ${url}\n\nReasons:\n- ${reasons.join('\n- ')}\n\nAction: Update signature config in src/platforms/algorithms.ts if applicable.`;

  await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    assignees: ['fix-auto'],
    labels: ['autoheal'],
  });
}


