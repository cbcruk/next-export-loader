import { describeExample, expect } from './utils';

const test = describeExample('basic-list-detail');

/**
 * Invariant #2, discriminating case: a stale loader's result must be discarded.
 *
 * Equal-delay races can't tell "last started wins" apart from "in-flight result
 * is discarded", and a same-component stale result is invisible (both render off
 * the current URL). So this test makes the stale result both LATE and OBSERVABLE:
 *
 * - Start a navigation to /slow, whose loader sleeps 1.5s without honoring the
 *   abort signal — so its (successful) result deterministically arrives LAST.
 * - Confirm it is actually in flight (the loading fallback is showing), then,
 *   via the persistent app-shell nav that lives outside LoaderRuntime, navigate
 *   to /items, a DIFFERENT page component, which resolves quickly.
 *
 * /items must render and stay rendered. If the runtime failed to discard the
 * stale /slow result, then ~1.5s later it would commit SlowPage as ready while
 * the URL is /items; because readyComponent !== the current Component, the
 * runtime falls back to the loading state — so /items content would vanish.
 *
 * Verified by mutation: neutering the post-await navId/cancelled guard in
 * loader-runtime makes this test fail.
 */
test.describe('navigation race: stale loader result is discarded', () => {
  test('a slow navigation, superseded mid-flight, never clobbers the new page', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/`);
    await expect(
      page.getByRole('heading', { name: 'next-export-loader example' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Slow page' }).click();
    await expect(page.getByText('Loading...')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Slow page loaded' }),
    ).not.toBeVisible();

    await page.getByRole('link', { name: 'Items', exact: true }).click();
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();
    expect(page.url()).toContain('/items');

    await page.waitForTimeout(2000);
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Slow page loaded' }),
    ).not.toBeVisible();
    await expect(page.getByText('Loading...')).not.toBeVisible();
    expect(page.url()).toContain('/items');
  });
});
