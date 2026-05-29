import { test, expect, startExample, type RunningExample } from './utils';

test.describe('auth-gated', () => {
  let app: RunningExample;

  test.beforeAll(async ({ mode }) => {
    app = await startExample('auth-gated', mode);
  });
  test.afterAll(async () => {
    await app?.stop();
  });

  test.describe('invariant 3: redirect happens before mount', () => {
    test('unauthenticated dashboard access redirects to login', async ({
      page,
    }) => {
      await page.goto(`${app.baseURL}/dashboard`);
      await expect(
        page.getByRole('heading', { name: 'Login' }),
      ).toBeVisible();
      expect(page.url()).toContain('/login');
      // The protected component never mounted.
      await expect(
        page.getByRole('heading', { name: 'Dashboard' }),
      ).not.toBeVisible();
    });

    test('dashboard mounts with profile data after login', async ({
      page,
    }) => {
      await page.goto(`${app.baseURL}/login`);
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(
        page.getByRole('heading', { name: 'Dashboard' }),
      ).toBeVisible();
      await expect(page.getByText('Jane Doe')).toBeVisible();
      expect(page.url()).toContain('/dashboard');
    });
  });
});
