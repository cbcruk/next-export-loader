# Instant navigation & the same-component loading gap

This is a design note, not shipped behavior. It records a bug found while
exploring "instant navigation" (in the sense of [Next.js 16.3][next163]), its
root cause, and a proposed fix — so the change can be designed deliberately
rather than bolted on.

[next163]: https://nextjs.org/blog/next-16-3-instant-navigations

## TL;DR

- On a **same-component navigation** that only changes the query param
  (`/items?id=1` → `/items?id=999`), the page re-renders with the **new** param
  *before* the loader settles.
- For a valid id that's a cache hit, this shows up as a one-frame loading flash
  (not truly "instant", despite invariant #4 holding).
- For an **invalid** id, the component renders with bad data and **crashes**
  into Next's error boundary *before* the loader's `RedirectError` can redirect
  — so the loading phase is not guarding same-component navigations, and
  invariant #3 is violated there.
- Both symptoms share one root cause and one fix.

Pinned by [`e2e/same-component-stale-param.spec.ts`](../e2e/same-component-stale-param.spec.ts)
(crash) and [`e2e/instant-navigation.spec.ts`](../e2e/instant-navigation.spec.ts)
(flash), each with a flag to flip green when fixed.

## Root cause

`LoaderRuntime` decides whether to show the page or the fallback from
`state.phase` and `state.readyComponent`
([loader-runtime.tsx](../packages/next-export-loader/src/loader-runtime.tsx)).
The only synchronous reset back to `loading` is:

```tsx
if (state.readyComponent !== null && state.readyComponent !== Component) {
  setState({ phase: 'loading', error: null, readyComponent: null });
}
```

This fires only when the **component identity** changes. A same-component
navigation (`ItemsPage` → `ItemsPage`, different `?id`) does not trip it, so:

1. The URL changes; `LoaderRuntime` re-renders with `phase: 'ready'` still set,
   and `isReady` is still `true`.
2. React therefore re-renders `children` (the page) immediately, now reading the
   **new** `router.query.id`.
3. The page derives its view from that param — e.g.
   `items.find((i) => i.id === id)!`. For an invalid id that's `undefined`, and
   the next line (`selected.title`) throws.
4. Only *after* that render does the effect run and `setState('loading')` — too
   late; the crash already happened.

The loader's redirect (`if (!items.some(...)) throw new RedirectError(...)`)
never gets the chance to run before the component renders the invalid state.

### Why valid ids "work" but still flash

For a valid id the derive succeeds, so there's no crash — but the effect still
unconditionally runs `setState('loading')` before the loader resolves from
cache, so the fallback paints for one commit. That's the flash
`instant-navigation.spec.ts` documents.

## Why the current loading phase is not a guard

It's tempting to think the loading fallback protects the redirect invariant. It
does for **cross-component** navigations (the reset above forces `loading`
synchronously, before the new component renders). It does **not** for
same-component navigations, which is exactly the case this note is about. The
fix has to close that asymmetry.

## Proposed behavior

The runtime should treat *any* navigation — same component or not — as "not
ready until the loader settles", while choosing what to show in the meantime:

1. **Hold the last-good render, or show the fallback, until the loader settles.**
   The page must not re-render with the new param while the loader is still
   deciding (data + redirect). Concretely, gate `children` on the navigation the
   loader is currently resolving, not just on component identity. The page only
   sees a param the loader has already validated.

2. **Skip the loading phase when the loader resolves from cache without
   redirecting.** If `ensureQueryData` is a cache hit and no `RedirectError` is
   thrown, commit straight to the new render — no `loading` frame. This is the
   "instant" win, and it falls out naturally once (1) holds the old render
   instead of flashing the fallback.

(1) fixes the crash and the invariant-#3 violation; (2) fixes the flash. They're
the same change viewed from two angles: stop coupling "which component" to "is
the new URL's data ready", and track readiness per navigation.

## Invariant impact

| Invariant | Today (same-component) | After fix |
| --- | --- | --- |
| #1 loader awaited before mount | violated (page renders new param pre-settle) | upheld |
| #2 latest navigation wins | upheld (navId) | upheld |
| #3 redirect decided before render | **violated** (crash precedes redirect) | upheld |
| #4 data is a cache hit | upheld (no refetch), but flashes | upheld, and now without a flash |

The fix strengthens #1 and #3; it does not weaken #2 or #4.

## Relationship to Next.js 16.3

16.3's Stream/Block taxonomy maps onto this library, but the mechanisms
(Cache Components, `'use cache'`, partial prefetching) are server-render features
that don't port to `output: 'export'`. What ports is the *yardstick*: a
navigation is "instant" when no loading frame of its own appears.

- Today the library only offers **Block** (await before mount), and even that
  leaks a frame on same-component navigations — the bug above.
- The proposed fix makes same-component cache hits genuinely instant, i.e. a
  correct Block with no spurious frame.
- A future **Stream** mode (mount immediately, let `useSuspenseQuery` suspend
  inside a `<Suspense>` boundary) is a larger, separate change. It trades away
  invariant #3 by construction (the component mounts before the loader can
  redirect), so it needs an opt-in and a 2-phase loader (redirect decision
  blocking, data streaming). Out of scope for this note.

## Test hooks

- [`e2e/same-component-stale-param.spec.ts`](../e2e/same-component-stale-param.spec.ts)
  — asserts the current crash; flip `fixed` to assert the redirect-without-crash
  behavior.
- [`e2e/instant-navigation.spec.ts`](../e2e/instant-navigation.spec.ts) — asserts
  the cache-hit switch still flashes; flip `switchIsInstant` once the loading
  phase is skipped on a cache-resolved, non-redirecting load.
- [`expectInstantNavigation`](../e2e/utils.ts) — the MutationObserver-based
  helper both specs use to catch even a single-frame fallback.
