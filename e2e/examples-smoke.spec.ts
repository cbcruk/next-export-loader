import { test, expect, startExample, type RunningExample } from './utils';

const EXAMPLES = [
  'auth-gated',
  'basic-list-detail',
  'dynamic-routes',
  'search-with-suggest',
] as const;

/**
 * Boots every example and checks it renders, in both `dev` and `static` modes.
 * This is the only spec the `dev` project runs (see playwright.config.ts): it
 * verifies `next dev` serves each example, while the deterministic static export
 * carries the detailed invariant assertions. Each example lives in its own dir,
 * so the per-example `next dev` servers never collide.
 */
for (const name of EXAMPLES) {
  test.describe(`smoke: ${name}`, () => {
    let app: RunningExample;

    test.beforeAll(async ({ mode }) => {
      app = await startExample(name, mode);
    });
    test.afterAll(async () => {
      await app?.stop();
    });

    test('home page boots and renders a heading', async ({ page }) => {
      await page.goto(`${app.baseURL}/`);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  });
}
