import { exec } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { repoRoot } from './utils';

const execAsync = promisify(exec);

/**
 * Builds the library and every example's static export (`out/`) up front, so the
 * static file servers the specs spin up just serve pre-built output — no
 * compilation at test time, and no two workers writing the same `out/`.
 */
export default async function globalSetup(): Promise<void> {
  await execAsync('pnpm --filter next-export-loader build', { cwd: repoRoot });

  const examplesDir = join(repoRoot, 'examples');
  const examples = readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  await Promise.all(
    examples.map(async (name) => {
      const cwd = join(examplesDir, name);
      rmSync(join(cwd, 'out'), { recursive: true, force: true });
      await execAsync('npx next build', { cwd });
    }),
  );
}
