import { describeExample, expect } from './utils';

const test = describeExample('permission-gated');

test.describe('permission-gated', () => {
  test.describe('unauthenticated → login, with the path preserved', () => {
    test('visiting a protected page redirects to login carrying ?redirect', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/admin/users`);

      await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
      expect(page.url()).toContain('/login');
      expect(page.url()).toContain('redirect=');
      expect(decodeURIComponent(page.url())).toContain('/admin/users');
      // The protected component never mounted.
      await expect(
        page.getByRole('heading', { name: 'Admin · Users' }),
      ).not.toBeVisible();
    });
  });

  test.describe('redirect return after login (pattern #2)', () => {
    test('logging in returns to the originally requested page', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/admin/users`);
      await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

      await page.getByRole('button', { name: /admin/i }).click();

      // Returned to /admin/users (not the home page) and the page mounted.
      await expect(
        page.getByRole('heading', { name: 'Admin · Users' }),
      ).toBeVisible();
      expect(page.url()).toContain('/admin/users');
    });
  });

  // The demo auth store is in-memory per JS context, so a full page load
  // (page.goto) resets it to logged-out. After login we navigate via link
  // clicks (client-side, session preserved) — the realistic SPA flow anyway.
  test.describe('permission enforcement (pattern #1)', () => {
    test('viewer can read posts', async ({ page, app }) => {
      await page.goto(`${app.baseURL}/login`);
      await page.getByRole('button', { name: /viewer/i }).click();
      await expect(
        page.getByRole('heading', { name: 'permission-gated example' }),
      ).toBeVisible();

      await page.getByRole('link', { name: /Posts/i }).click();
      await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
    });

    test('viewer is sent to /unauthorized for an admin page', async ({
      page,
      app,
    }) => {
      await page.goto(`${app.baseURL}/login`);
      await page.getByRole('button', { name: /viewer/i }).click();
      await expect(
        page.getByRole('heading', { name: 'permission-gated example' }),
      ).toBeVisible();

      await page.getByRole('link', { name: /Admin · Billing/i }).click();
      await expect(
        page.getByRole('heading', { name: /Not authorized/i }),
      ).toBeVisible();
      expect(page.url()).toContain('/unauthorized');
    });

    test('admin reaches the admin billing page', async ({ page, app }) => {
      await page.goto(`${app.baseURL}/login`);
      await page.getByRole('button', { name: /admin/i }).click();
      await expect(
        page.getByRole('heading', { name: 'permission-gated example' }),
      ).toBeVisible();

      await page.getByRole('link', { name: /Admin · Billing/i }).click();
      await expect(
        page.getByRole('heading', { name: 'Admin · Billing' }),
      ).toBeVisible();
    });
  });
});
