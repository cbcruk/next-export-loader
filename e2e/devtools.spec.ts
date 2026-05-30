import { describeExample, expect } from './utils';

const test = describeExample('basic-list-detail');

test.describe('LoaderDevtools', () => {
  test('toggle button stays visible across phases', async ({ page, app }) => {
    await page.goto(`${app.baseURL}/items`);
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Loader' })).toBeVisible();
  });

  test('logs navigations from the very first one, with redirect chains', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/items`);
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Loader' }).click();
    await expect(page.getByText('Loader Devtools')).toBeVisible();

    // The initial /items load redirects to /items?id=1 — two entries, and the
    // first navigation is captured (the devtools store is enabled before the
    // loader runs). Component names are minified in the production build, so we
    // assert on URLs/redirect chains instead.
    await expect(page.getByText('2 navigations')).toBeVisible();
    await expect(page.getByText(/↳\s*\/items\?id=1/)).toBeVisible();
  });

  test('appends an entry on each client-side navigation', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/items`);
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Loader' }).click();
    await expect(page.getByText('2 navigations')).toBeVisible();

    await page.click('a:has-text("Banana")');
    await expect(
      page.locator('main').getByRole('heading', { name: 'Banana' }),
    ).toBeVisible();

    await expect(page.getByText('3 navigations')).toBeVisible();
  });
});
