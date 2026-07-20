/**
 * A module-level counter the page's loader bumps every time it runs. It exists
 * only to make the point of this example observable: a **shallow** sort/filter
 * change (via `shallowPush`) does not run the loader, so this number does not
 * move — whereas a full navigation does.
 */
export const loaderRuns = { count: 0 };
