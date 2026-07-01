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
 * Two assertions:
 *
 *   - a cold client-side navigation is NOT instant (a cross-component nav runs
 *     the loader from scratch and shows the fallback), and
 *   - a same-component item switch on an `instant` page IS instant — the runtime
 *     holds the last validated render (the page reads its param via
 *     useLoaderQuery) and skips the loading frame when the loader resolves from
 *     cache without redirecting.
 *
 * The second was the parked "part 2" gap; it closed once basic-list-detail's
 * ItemsPage opted into `loaderMode = 'instant'` and moved its param read onto
 * useLoaderQuery. See docs/instant-navigation.md.
 */
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

  test('a same-component item switch on an instant page shows no loading frame', async ({
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

    await expectInstantNavigation(page, 'Loading...', switchItem);
  });
});
