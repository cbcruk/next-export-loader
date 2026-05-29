import { exec } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { FullConfig } from '@playwright/test';
import { repoRoot } from './utils';

const execAsync = promisify(exec);

/**
 * Builds the library once, and — when any project runs in `static` mode —
 * builds every example's `out/` ahead of the workers. Building up front keeps
 * the static file server race-free (no two workers writing the same `out/`).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  await execAsync('pnpm --filter next-export-loader build', { cwd: repoRoot });

  const needsStatic = config.projects.some(
    (project) => project.use['mode' as keyof typeof project.use] === 'static',
  );
  if (!needsStatic) return;

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
