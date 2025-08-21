import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

function loadIfExists(file: string) {
  const p = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

export function ensureEnvLoaded(): void {
  loadIfExists('.env');
  loadIfExists('.env.local');
}


