import { describeExample, expect } from './utils';

const test = describeExample('search-with-suggest');

test.describe('search-with-suggest', () => {
  test('loader prefetches the full list on first load', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/search`);
    await expect(page.getByText('8 results')).toBeVisible();
  });

  test('searching narrows the results via the loader', async ({
    page,
    app,
  }) => {
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
      app,
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
