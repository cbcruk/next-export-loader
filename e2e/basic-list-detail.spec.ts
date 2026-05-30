import { describeExample, expect } from './utils';

const test = describeExample('basic-list-detail');

test.describe('basic-list-detail', () => {
  test.describe('invariant 1: loader completes before component mount', () => {
    test('shows loading state before loader completes', async ({ page, app }) => {
      await page.goto(`${app.baseURL}/items`);
      await expect(page.getByText('Loading...')).toBeVisible();
      await expect(
        page.locator('main').getByRole('heading', { name: 'Apple' }),
      ).toBeVisible();
      expect(page.url()).toContain('id=1');
    });

    test('page without loader renders without loading state', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/`);
      await expect(
        page.getByRole('heading', { name: 'next-export-loader example' }),
      ).toBeVisible();
      await expect(page.getByText('Loading...')).not.toBeVisible();
    });
  });

  test.describe('invariant 2: navigation race — latest wins', () => {
    test('navigating away during loader cancels the load', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/`);
      await expect(
        page.getByRole('heading', { name: 'next-export-loader example' }),
      ).toBeVisible();

      await page.click('a:has-text("Go to Items")');
      await expect(page.getByText('Loading...')).toBeVisible();

      await page.goBack();
      await expect(
        page.getByRole('heading', { name: 'next-export-loader example' }),
      ).toBeVisible();
    });

    test('rapid item clicks resolve to the last clicked', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/items`);
      await expect(
        page.locator('main').getByRole('heading', { name: 'Apple' }),
      ).toBeVisible();

      await page.click('a:has-text("Cherry")');
      await page.click('a:has-text("Elderberry")');

      await expect(
        page.locator('main').getByRole('heading', { name: 'Elderberry' }),
      ).toBeVisible();
      expect(page.url()).toContain('id=5');
    });
  });

  test.describe('invariant 3: redirect happens before mount', () => {
    test('redirects to first item when no id provided', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/items`);
      await expect(
        page.locator('main').getByRole('heading', { name: 'Apple' }),
      ).toBeVisible();
      expect(page.url()).toContain('id=1');
    });

    test('redirects to first item when invalid id provided', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/items?id=999`);
      await expect(
        page.locator('main').getByRole('heading', { name: 'Apple' }),
      ).toBeVisible();
      expect(page.url()).toContain('id=1');
    });

    test('redirects after client-side navigation from home', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/`);
      await page.click('a:has-text("Go to Items")');
      await expect(
        page.locator('main').getByRole('heading', { name: 'Apple' }),
      ).toBeVisible();
      expect(page.url()).toContain('id=1');
    });
  });

  test.describe('invariant 4: cache hit — no loading on item switch', () => {
    test('switching items does not show loading state', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/items`);
      await expect(
        page.locator('main').getByRole('heading', { name: 'Apple' }),
      ).toBeVisible();

      await page.click('a:has-text("Banana")');

      await expect(
        page.locator('main').getByRole('heading', { name: 'Banana' }),
      ).toBeVisible();
      await expect(page.getByText('Loading...')).not.toBeVisible();
      expect(page.url()).toContain('id=2');
    });
  });
});
