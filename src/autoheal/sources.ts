import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { htmlToText } from "html-to-text";

export interface PlatformDocDiff {
  platform: string;
  url: string;
  oldContent: string | null;
  newContent: string;
}

const PLATFORM_DOC_SOURCES: Array<{ platform: string; url: string }> = [
  {
    platform: "stripe",
    url: "https://docs.stripe.com/webhooks.md#verify-manually",
  },
  {
    platform: "dodopayments",
    url: "https://docs.dodopayments.com/developer-resources/webhooks#securing-webhooks",
  },
  {
    platform: "github",
    url: "https://docs.github.com/webhooks-and-events/webhooks/securing-your-webhooks",
  },
  {
    platform: "clerk",
    url: "hhttps://docs.svix.com/receiving/verifying-payloads/how-manual",
  },
  // { platform: 'vercel', url: 'https://vercel.com/docs/webhooks/webhooks-api#securing-webhooks' },
  // { platform: 'polar', url: 'https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md' },
];

const STORAGE_DIR = path.join(process.cwd(), ".autoheal");

export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

function platformDir(platform: string): string {
  return path.join(STORAGE_DIR, platform);
}

async function listSnapshotFiles(platform: string): Promise<string[]> {
  try {
    const dir = platformDir(platform);
    const names = await fs.readdir(dir);
    return names.filter((n) => n.endsWith(".txt")).sort();
  } catch {
    return [];
  }
}

async function readLatestSnapshot(
  platform: string
): Promise<{ name: string; content: string } | null> {
  const files = await listSnapshotFiles(platform);
  if (files.length === 0) return null;
  const name = files[files.length - 1];
  const content = await fs.readFile(
    path.join(platformDir(platform), name),
    "utf8"
  );
  return { name, content };
}

function hashContent(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function writeSnapshot(platform: string, content: string): Promise<void> {
  const dir = platformDir(platform);
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(dir, `${timestamp}.txt`);
  await fs.writeFile(filePath, content, "utf8");
}

async function pruneSnapshots(
  platform: string,
  keep: number = Number(process.env.SNAPSHOT_KEEP || 3)
): Promise<void> {
  const files = await listSnapshotFiles(platform);
  const excess = files.length - keep;
  if (excess > 0) {
    const toDelete = files.slice(0, excess);
    await Promise.all(
      toDelete.map((f) => fs.rm(path.join(platformDir(platform), f)))
    );
  }
}

export async function fetchAndRotateDocs(): Promise<PlatformDocDiff[]> {
  await ensureStorageDir();
  const diffs: PlatformDocDiff[] = [];
  for (const { platform, url } of PLATFORM_DOC_SOURCES) {
    const res = await fetch(url);
    const html = await res.text();
    const extracted = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: "nav", format: "skip" },
        { selector: "header", format: "skip" },
        { selector: "footer", format: "skip" },
        { selector: "aside", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "noscript", format: "skip" },
      ],
      baseElements: {
        selectors: ["main", "article", "#content", "#docs-content"],
      },
      preserveNewlines: true,
    }).trim();
    const newContent = extracted
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n");
    const latest = await readLatestSnapshot(platform);
    const changed =
      !latest || hashContent(latest.content) !== hashContent(newContent);
    if (changed) {
      const oldContent = latest ? latest.content : null;
      await writeSnapshot(platform, newContent);
      await pruneSnapshots(platform);
      if (oldContent !== null) {
        diffs.push({ platform, url, oldContent, newContent });
      }
    }
  }
  return diffs;
}
