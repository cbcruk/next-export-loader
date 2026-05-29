import { test, expect, startExample, type RunningExample } from './utils';

test.describe('search-with-suggest', () => {
  let app: RunningExample;

  test.beforeAll(async ({ mode }) => {
    app = await startExample('search-with-suggest', mode);
  });
  test.afterAll(async () => {
    await app?.stop();
  });

  test('loader prefetches the full list on first load', async ({ page }) => {
    await page.goto(`${app.baseURL}/search`);
    await expect(page.getByText('8 results')).toBeVisible();
  });

  test('searching narrows the results via the loader', async ({ page }) => {
    await page.goto(`${app.baseURL}/search`);
    await expect(page.getByText('8 results')).toBeVisible();

    await page.getByPlaceholder('Search books...').fill('1984');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText('1 result for "1984"')).toBeVisible();
    expect(page.url()).toContain('q=1984');
  });

  test.describe('invariant 2: navigation race — latest query wins', () => {
    test('rapid searches resolve to the last submitted query', async ({
      page,
    }) => {
      await page.goto(`${app.baseURL}/search`);
      await expect(page.getByText('8 results')).toBeVisible();

      const input = page.getByPlaceholder('Search books...');
      await input.fill('Gatsby');
      await input.press('Enter');
      await input.fill('1984');
      await input.press('Enter');

      await expect(page.getByText('1 result for "1984"')).toBeVisible();
      expect(page.url()).toContain('q=1984');
    });
  });
});
