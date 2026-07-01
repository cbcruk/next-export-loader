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

      // Fire two searches through Next's client router — the same path a form
      // submit takes (SearchPage's onSubmit calls router.push). We drive the
      // router directly, NOT the text input, on purpose: the input is controlled
      // by `useState(q)` and resets when the page remounts after a navigation
      // settles, so a second `fill()` can be clobbered by the first search's
      // remount mid-keystroke — an example quirk, not a library behavior.
      //
      // Two separate evaluate() calls (not one with two synchronous pushes,
      // which Next collapses by cancelling the second) issue two distinct
      // navigations. The second supersedes the first while it may still be in
      // flight; the runtime must discard the stale loader so the last query wins.
      const search = (q: string): Promise<void> =>
        page.evaluate((query) => {
          const w = window as unknown as {
            next: { router: { push: (url: string) => Promise<boolean> } };
          };
          void w.next.router.push(`/search?q=${query}`);
        }, q);

      await search('Gatsby');
      await search('1984');

      await expect(page.getByText('1 result for "1984"')).toBeVisible();
      expect(page.url()).toContain('q=1984');
      // The superseded query never wins the final render.
      await expect(page.getByText('for "Gatsby"')).not.toBeVisible();
    });
  });
});
