import {
  describeExample,
  expect,
  expectInstantNavigation,
} from './utils';

const test = describeExample('shallow-list-filter');

/**
 * Shallow navigation: a URL-backed sort/filter change over already-loaded data,
 * triggered by `shallowPush`, must update the view and the URL **without running
 * the loader** and without a loading frame. The page shows a "Loader runs"
 * counter its loader bumps on every real run; a shallow change leaves it put, an
 * ordinary navigation increments it.
 *
 * Prototype for docs/shallow-navigation.md.
 */
test.describe('shallow-list-filter', () => {
  const firstProduct = (page: import('@playwright/test').Page) =>
    page.locator('[data-testid="product"]').first();
  const products = (page: import('@playwright/test').Page) =>
    page.locator('[data-testid="product"]');
  const loaderRuns = (page: import('@playwright/test').Page) =>
    page.getByTestId('loader-runs');

  test('loads once, name-sorted', async ({ page, app }) => {
    await page.goto(`${app.baseURL}/list`);
    await expect(firstProduct(page)).toContainText('Apple');
    await expect(products(page)).toHaveCount(9);
    await expect(loaderRuns(page)).toHaveText('1');
  });

  test('shallow sort updates the view + URL, does not run the loader, no fallback', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/list`);
    await expect(firstProduct(page)).toContainText('Apple');
    await expect(loaderRuns(page)).toHaveText('1');

    await expectInstantNavigation(page, 'Loading...', async () => {
      await page.getByRole('button', { name: 'price', exact: true }).click();
      // Carrot is the cheapest ($1), so it leads once sorted by price.
      await expect(firstProduct(page)).toContainText('Carrot');
    });

    expect(page.url()).toContain('sort=price');
    // The whole point: the loader never re-ran.
    await expect(loaderRuns(page)).toHaveText('1');
  });

  test('shallow filter narrows the list without running the loader', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/list`);
    await expect(firstProduct(page)).toContainText('Apple');

    await expectInstantNavigation(page, 'Loading...', async () => {
      await page.getByRole('button', { name: 'fruit', exact: true }).click();
      await expect(products(page)).toHaveCount(3);
    });

    expect(page.url()).toContain('category=fruit');
    await expect(loaderRuns(page)).toHaveText('1');
  });

  test('shallow changes compose: filter then sort, still one loader run', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/list`);
    await expect(firstProduct(page)).toContainText('Apple');

    await page.getByRole('button', { name: 'fruit', exact: true }).click();
    await expect(products(page)).toHaveCount(3);
    await page.getByRole('button', { name: 'price', exact: true }).click();
    // Fruit sorted by price: Banana ($2) leads.
    await expect(firstProduct(page)).toContainText('Banana');

    expect(page.url()).toContain('category=fruit');
    expect(page.url()).toContain('sort=price');
    await expect(loaderRuns(page)).toHaveText('1');
  });

  test('an ordinary navigation DOES run the loader (contrast)', async ({
    page,
    app,
  }) => {
    await page.goto(`${app.baseURL}/list`);
    await expect(loaderRuns(page)).toHaveText('1');

    // Shallow-change away from defaults first...
    await page.getByRole('button', { name: 'fruit', exact: true }).click();
    await expect(products(page)).toHaveCount(3);
    await expect(loaderRuns(page)).toHaveText('1');

    // ...then a full navigation (a normal <Link>) re-runs the loader and resets.
    await page.getByTestId('full-nav-reset').click();
    await expect(loaderRuns(page)).toHaveText('2');
    await expect(products(page)).toHaveCount(9);
    await expect(firstProduct(page)).toContainText('Apple');
  });
});
