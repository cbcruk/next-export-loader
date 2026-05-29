import { test, expect, startExample, type RunningExample } from './utils';

const EXAMPLES = [
  'auth-gated',
  'basic-list-detail',
  'dynamic-routes',
  'search-with-suggest',
] as const;

/**
 * Boots every example's static export and checks its home page renders — a
 * cheap canary that each example builds and serves.
 */
for (const name of EXAMPLES) {
  test.describe(`smoke: ${name}`, () => {
    let app: RunningExample;

    test.beforeAll(async () => {
      app = await startExample(name);
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
