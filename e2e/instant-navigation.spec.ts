import {
  describeExample,
  expect,
  expectInstantNavigation,
} from './utils';

const test = describeExample('basic-list-detail');

/**
 * "Instant navigation" probe, in the spirit of Next 16.3: a navigation is
 * instant when no loading frame of its own appears. expectInstantNavigation
 * latches any appearance of the fallback via a MutationObserver, so it catches
 * even a single-frame flash the eye would miss.
 *
 * This spec documents a real finding. The library guarantees a *cache hit* on
 * mount (no refetch — invariant #4), but the runtime still drives every
 * navigation through `phase: 'loading'` unconditionally
 * (loader-runtime.tsx), so even a same-component cache-hit switch flashes the
 * fallback for one commit. So today's honest assertions are:
 *
 *   - a cold client-side navigation is NOT instant (loader runs), and
 *   - a same-query item switch is ALSO not yet instant — it's a cache hit with
 *     no refetch, but the unconditional loading phase still flashes.
 *
 * The second is the gap to close to reach true instant navigation (skip the
 * loading phase when the loader resolves from cache without redirecting). When
 * that lands, flip `switchIsInstant` to true.
 */
const switchIsInstant = false;

test.describe('instant navigation (loading-frame probe)', () => {
  test('a cold client-side navigation is not instant — guards the helper', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/`);
    await expect(
      page.getByRole('heading', { name: 'next-export-loader example' }),
    ).toBeVisible();

    // The items loader runs cold here, so the fallback DOES appear: the helper
    // must reject. If it didn't, it would be vacuous.
    await expect(
      expectInstantNavigation(page, 'Loading...', async () => {
        await page.click('a:has-text("Go to Items")');
        await expect(
          page.locator('main').getByRole('heading', { name: 'Apple' }),
        ).toBeVisible();
      }),
    ).rejects.toThrow(/instant/);
  });

  test('a same-query item switch is a cache hit but still flashes loading today', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/items`);
    await expect(
      page.locator('main').getByRole('heading', { name: 'Apple' }),
    ).toBeVisible();

    const switchItem = async (): Promise<void> => {
      await page.click('a:has-text("Banana")');
      await expect(
        page.locator('main').getByRole('heading', { name: 'Banana' }),
      ).toBeVisible();
    };

    if (switchIsInstant) {
      await expectInstantNavigation(page, 'Loading...', switchItem);
    } else {
      // Documents the current gap: cache hit, yet the loading phase flashes.
      await expect(
        expectInstantNavigation(page, 'Loading...', switchItem),
      ).rejects.toThrow(/instant/);
    }
  });
});
