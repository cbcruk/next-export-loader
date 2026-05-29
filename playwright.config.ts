import { defineConfig } from '@playwright/test';
import type { Mode } from './e2e/utils';

/**
 * Specs own their own example servers (via e2e/utils#startExample) on
 * dynamically allocated ports, so there is no global `webServer`.
 *
 * The `static` project runs everything against the real `output: 'export'`
 * build — the library's actual target, and deterministic (no compilation). The
 * `dev` project runs only the smoke spec, confirming each example boots under
 * `next dev`; the detailed invariant assertions live in `static` to avoid
 * `next dev`'s cold-compile/hydration flakiness, since the loader runtime
 * behaves identically in both modes.
 */
export default defineConfig<{ mode: Mode }>({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Cap concurrency: each spec boots its own server, so too many parallel
  // workers means too many cold compiles at once, which flakes under load.
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'dev',
      testMatch: /examples-smoke\.spec\.ts/,
      use: { browserName: 'chromium', mode: 'dev' },
    },
    {
      name: 'static',
      use: { browserName: 'chromium', mode: 'static' },
    },
  ],
});
