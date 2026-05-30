import { describeExample, expect } from './utils';

const test = describeExample('basic-list-detail');

/**
 * useLoaderPhase drives the example's ProgressBar (role="progressbar"), which
 * renders only while phase === 'loading'. Navigating to /slow (a 1.5s loader)
 * gives a window where the hook reports 'loading'; once it resolves the hook
 * reports 'ready' and the bar unmounts. This is the only way to exercise the
 * hook's phase transitions — it reads from LoaderRuntime's store, which only
 * exists in a real render.
 */
test.describe('useLoaderPhase', () => {
  test('reports loading during a navigation and ready after it', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/`);
    await expect(
      page.getByRole('heading', { name: 'next-export-loader example' }),
    ).toBeVisible();
    // No loader in flight on the (loaderless) home page.
    await expect(page.getByRole('progressbar')).not.toBeVisible();

    await page.getByRole('link', { name: 'Slow page' }).click();

    // phase === 'loading': the bar is shown.
    await expect(page.getByRole('progressbar')).toBeVisible();

    // phase === 'ready': the page mounted and the bar is gone.
    await expect(
      page.getByRole('heading', { name: 'Slow page loaded' }),
    ).toBeVisible();
    await expect(page.getByRole('progressbar')).not.toBeVisible();
  });
});
