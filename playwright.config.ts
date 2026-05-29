import { defineConfig } from '@playwright/test';

/**
 * Specs own their own static file servers (via e2e/utils#startExample) on
 * dynamically allocated ports, so there is no global `webServer`. Everything
 * runs against the real `output: 'export'` build — the library's actual target,
 * and deterministic (no compilation). The loader runtime is client-side and
 * behaves identically under `next dev`, so the static export is the single
 * source of truth for the suite. global-setup builds the library and every
 * example's `out/` up front.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
