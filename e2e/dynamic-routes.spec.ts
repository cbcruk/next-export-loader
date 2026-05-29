import { test, expect, startExample, type RunningExample } from './utils';

test.describe('dynamic-routes', () => {
  let app: RunningExample;

  test.beforeAll(async ({ mode }) => {
    app = await startExample('dynamic-routes', mode);
  });
  test.afterAll(async () => {
    await app?.stop();
  });

  test('loads a post detail by query id', async ({ page }) => {
    await page.goto(`${app.baseURL}/posts/detail?id=1`);
    await expect(
      page.getByRole('heading', { name: 'Hello World' }),
    ).toBeVisible();
  });

  test.describe('invariant 3: redirect happens before mount', () => {
    test('missing id redirects to the posts list', async ({ page }) => {
      await page.goto(`${app.baseURL}/posts/detail`);
      await expect(
        page.getByRole('heading', { name: 'Posts' }),
      ).toBeVisible();
      expect(page.url()).toContain('/posts');
      expect(page.url()).not.toContain('/detail');
    });
  });

  test.describe('loader error renders errorFallback (not the component)', () => {
    test('unknown id shows the Not Found fallback', async ({ page }) => {
      await page.goto(`${app.baseURL}/posts/detail?id=999`);
      await expect(
        page.getByRole('heading', { name: 'Not Found' }),
      ).toBeVisible();
      // The detail component must not have mounted with empty data.
      await expect(page.getByText('Back to posts')).toBeVisible();
    });
  });
});
