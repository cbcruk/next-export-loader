import { describeExample, expect } from './utils';

const test = describeExample('dynamic-routes');

test.describe('dynamic-routes', () => {
  test('loads a post detail by query id', async ({ page, app }) => {
    await page.goto(`${app.baseURL}/posts/detail?id=1`);
    await expect(
      page.getByRole('heading', { name: 'Hello World' }),
    ).toBeVisible();
  });

  test.describe('invariant 3: redirect happens before mount', () => {
    test('missing id redirects to the posts list', async ({ page, app }) => {
      await page.goto(`${app.baseURL}/posts/detail`);
      await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
      expect(page.url()).toContain('/posts');
      expect(page.url()).not.toContain('/detail');
    });
  });

  test.describe('loader error renders errorFallback (not the component)', () => {
    test('unknown id shows the Not Found fallback', async ({ page, app }) => {
      await page.goto(`${app.baseURL}/posts/detail?id=999`);
      await expect(
        page.getByRole('heading', { name: 'Not Found' }),
      ).toBeVisible();
      await expect(page.getByText('Back to posts')).toBeVisible();
    });
  });
});
