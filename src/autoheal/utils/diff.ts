export type { PlatformDocDiff } from '../sources';
import { structuredPatch } from 'diff';

function stripPrefix(line: string): string {
  if (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-')) {
    return line.slice(1);
  }
  return line;
}

export function buildUnifiedDiff(oldContent: string, newContent: string): string {
  const contextLines = Number(process.env.DIFF_CONTEXT_LINES || 3);
  const patch = structuredPatch('old', 'new', oldContent, newContent, '', '', {
    context: contextLines,
  });

  if (!patch.hunks || patch.hunks.length === 0) {
    return '';
  }

  const out: string[] = [];
  for (const h of patch.hunks) {
    out.push(`@@ old:${h.oldStart} new:${h.newStart} context:${contextLines} @@`);

    let deleted: string[] = [];
    let added: string[] = [];

    const flushChangeGroup = () => {
      if (deleted.length === 0 && added.length === 0) return;
      if (deleted.length === 1 && added.length === 1) {
        out.push(`[updated] ${deleted[0]} → ${added[0]}`);
      } else {
        for (const d of deleted) out.push(`[deleted] ${d}`);
        for (const a of added) out.push(`[added] ${a}`);
      }
      deleted = [];
      added = [];
    };

    for (const raw of h.lines) {
      const pref = raw[0];
      const line = stripPrefix(raw);
      if (pref === ' ') {
        flushChangeGroup();
        out.push(line);
      } else if (pref === '-') {
        deleted.push(line);
      } else if (pref === '+') {
        added.push(line);
      }
    }
    flushChangeGroup();
    out.push('');
  }

  return out.join('\n');
}


