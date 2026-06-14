import { describeExample, expect } from './utils';

const EXAMPLES = [
  'auth-gated',
  'basic-list-detail',
  'dynamic-routes',
  'permission-gated',
  'search-with-suggest',
] as const;

/**
 * Boots every example's static export and checks its home page renders — a
 * cheap canary that each example builds and serves.
 */
for (const name of EXAMPLES) {
  const test = describeExample(name);

  test.describe(`smoke: ${name}`, () => {
    test('home page boots and renders a heading', async ({ page, app }) => {
      await page.goto(`${app.baseURL}/`);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  });
}
