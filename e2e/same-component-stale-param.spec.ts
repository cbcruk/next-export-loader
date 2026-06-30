import { describeExample, expect } from './utils';

const test = describeExample('basic-list-detail');

/**
 * Known bug, pinned so a fix can flip it green.
 *
 * On a SAME-COMPONENT navigation that changes only the query param
 * (/items?id=1 → /items?id=999), LoaderRuntime keeps phase 'ready' because
 * `readyComponent === Component` — the reset that forces 'loading' only fires
 * when the component itself changes (loader-runtime.tsx). So the page re-renders
 * with the NEW param before the loader settles. For an invalid id, ItemsPage
 * computes `items.find(... id === '999')! ` → undefined and crashes on
 * `selected.title`, BEFORE the loader's RedirectError can redirect.
 *
 * This means the loading phase is NOT acting as a guard for same-component
 * navigations — invariant #3 (redirect decided before the component renders the
 * new state) is violated here today. A fix should hold the last-good render (or
 * show the fallback) until the loader settles for same-component navigations
 * too; then `fixed` flips to true.
 *
 * The nav is driven through Next's client router (window.next.router) — the same
 * path a <Link> click takes — so no example page needs a throwaway invalid link.
 */
const fixed = false;

test.describe('same-component navigation to an invalid param', () => {
  test('does not crash the page before the loader redirects', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/items?id=1`);
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();

    await page.evaluate(() => {
      const w = window as unknown as {
        next: { router: { push: (u: string) => Promise<boolean> } };
      };
      void w.next.router.push('/items?id=999');
    });

    const appError = page.getByText(/Application error/i);
    const redirectedHeading = page
      .locator('main')
      .getByRole('heading', { name: 'Apple' });

    if (fixed) {
      // Desired behavior: the invalid id is redirected back to id=1 with no
      // client-side exception in between.
      await expect(redirectedHeading).toBeVisible();
      await expect(appError).not.toBeVisible();
      expect(page.url()).toContain('id=1');
    } else {
      // Current behavior: the component renders with the stale/invalid param and
      // crashes into Next's error boundary before the loader can redirect.
      await expect(appError).toBeVisible();
    }
  });
});
