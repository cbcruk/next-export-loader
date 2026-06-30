# Instant navigation & the same-component loading gap

A design note recording a bug found while exploring "instant navigation" (in the
sense of [Next.js 16.3][next163]), its root cause, the fix that shipped, and the
part that deliberately did not.

[next163]: https://nextjs.org/blog/next-16-3-instant-navigations

## TL;DR

- On a **same-component navigation** that only changes the query param
  (`/items?id=1` → `/items?id=999`), the page used to re-render with the **new**
  param *before* the loader settled.
- For a valid id that's a cache hit, this showed up as a one-frame loading flash
  (not truly "instant", despite invariant #4 holding).
- For an **invalid** id, the component rendered with bad data and **crashed**
  into Next's error boundary *before* the loader's `RedirectError` could redirect
  — the loading phase was not guarding same-component navigations, and invariant
  #3 was violated there.
- **Shipped:** readiness is now tracked per navigation (`readyPath`), so the
  loader re-runs and the page waits for it before rendering the new param. The
  crash and the invariant-#3 violation are fixed.
- **Not shipped:** the cache-hit flash. Removing it needs a held-render
  mechanism (Stream mode), out of scope here.

Pinned by [`e2e/same-component-stale-param.spec.ts`](../e2e/same-component-stale-param.spec.ts)
(crash — now green) and [`e2e/instant-navigation.spec.ts`](../e2e/instant-navigation.spec.ts)
(flash — still documents the remaining gap via `switchIsInstant`).

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

## The two parts (and why only one is done)

These looked like one change from two angles. Implementing the first showed
they're not — the second is strictly harder and is *not* shipped.

1. **Gate readiness per navigation (DONE).** The runtime tracks `readyPath` (the
   `router.asPath` the loader resolved for) alongside `readyComponent`, and
   treats *any* target change — different component OR same-component param
   change — as "not ready until the loader settles". While loading it shows the
   fallback, so the page never renders a param the loader hasn't validated. This
   fixes the crash and the invariant-#3 violation.

2. **Skip the loading frame on a cache hit (NOT done).** Truly instant means no
   loading frame at all when the loader resolves from cache without redirecting.
   The naive hope was that (1) gives this for free — it does **not**. (1) shows
   the *fallback* during the in-flight window; to show nothing instead, the
   runtime would have to **hold the previous, already-valid render** until the
   loader settles. But the page reads the new param directly via `useRouter()`,
   so a held element reference still re-reads the new `?id` — freezing it needs
   a `<Suspense>` boundary / held-render mechanism. That's the Stream-mode
   territory below, and it trades away invariant #3. So same-component cache-hit
   switches still flash one frame today; that's the remaining gap.

## Invariant impact

| Invariant | Before | After part 1 (shipped) |
| --- | --- | --- |
| #1 loader awaited before mount | violated (page renders new param pre-settle) | upheld |
| #2 latest navigation wins | upheld (navId) | upheld |
| #3 redirect decided before render | **violated** (crash precedes redirect) | upheld |
| #4 data is a cache hit | upheld (no refetch), but flashes | upheld; **still flashes** (part 2) |

Part 1 strengthens #1 and #3 and weakens neither #2 nor #4. The flash under #4
is not a correctness issue — it's the instant-navigation gap part 2 would close.

## Relationship to Next.js 16.3

16.3's Stream/Block taxonomy maps onto this library, but the mechanisms
(Cache Components, `'use cache'`, partial prefetching) are server-render features
that don't port to `output: 'export'`. What ports is the *yardstick*: a
navigation is "instant" when no loading frame of its own appears.

- The library offers **Block** (await before mount). Part 1 made it a *correct*
  Block — same-component navigations now wait for the loader instead of rendering
  the new param early — but it still shows a fallback frame, so it is not yet
  "instant" by the 16.3 yardstick.
- Making same-component cache hits genuinely instant (no frame at all) is part 2,
  and needs the held-render mechanism below.
- A future **Stream** mode (mount immediately, let `useSuspenseQuery` suspend
  inside a `<Suspense>` boundary) is a larger, separate change. It trades away
  invariant #3 by construction (the component mounts before the loader can
  redirect), so it needs an opt-in and a 2-phase loader (redirect decision
  blocking, data streaming). Out of scope for this note.

## Test hooks

- [`e2e/same-component-stale-param.spec.ts`](../e2e/same-component-stale-param.spec.ts)
  — `fixed = true`: asserts the navigation redirects without crashing (part 1).
- [`e2e/instant-navigation.spec.ts`](../e2e/instant-navigation.spec.ts) — asserts
  the cache-hit switch still flashes; flip `switchIsInstant` once part 2 skips the
  loading frame on a cache-resolved, non-redirecting load.
- [`expectInstantNavigation`](../e2e/utils.ts) — the MutationObserver-based
  helper both specs use to catch even a single-frame fallback.
