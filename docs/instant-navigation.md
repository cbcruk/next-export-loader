# Instant navigation & the same-component loading gap

A design note recording a bug found while exploring "instant navigation" (in the
sense of [Next.js 16.3][next163]), its root cause, the fix that shipped, and the
part that was parked — then later shipped.

[next163]: https://nextjs.org/blog/next-16-3-instant-navigations

> **Update (part 2 shipped).** The cache-hit flash is now closed via the exact
> "least-bad route" this note predicted: an opt-in `loaderMode: 'instant'` scoped
> to pages that read their params through `useLoaderQuery` instead of
> `useRouter()`. Landed alongside the `defineLoader({ validate })` + `useLoaderQuery`
> work — see [tanstack-inspired-improvements.md](./tanstack-inspired-improvements.md).
> The analysis below is preserved as the reasoning that led there; the "parked"
> framing is historical. `instant-navigation.spec.ts` now asserts the switch is
> instant (0 loading frames).

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
- **Shipped later (part 2):** removing the cache-hit flash. The blocker below was
  "the page reads `router.query` directly, so the runtime can't withhold an
  unvalidated param". `useLoaderQuery` dissolved it — the page now reads a
  runtime-owned validated query, so `loaderMode: 'instant'` can hold the last
  render until the loader settles. Opt-in, per page. See "Part 2 design" below and
  the resolution box at the top.

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
is not a correctness issue — it's the instant-navigation gap part 2 has since
closed for pages on `loaderMode: 'instant'` (see the resolution box at the top).

## Relationship to Next.js 16.3

16.3's Stream/Block taxonomy maps onto this library, but the mechanisms
(Cache Components, `'use cache'`, partial prefetching) are server-render features
that don't port to `output: 'export'`. What ports is the *yardstick*: a
navigation is "instant" when no loading frame of its own appears.

- The library offers **Block** (await before mount). Part 1 made it a *correct*
  Block — same-component navigations now wait for the loader instead of rendering
  the new param early — but it still shows a fallback frame, so it is not yet
  "instant" by the 16.3 yardstick.
- Making same-component cache hits genuinely instant (no frame at all) is part 2.
  Probes show the *timing* is achievable without `<Suspense>`, but freezing what
  the page sees isn't possible through `_app`'s children — so part 2 is parked.
  See "Part 2 design" below.
- A separate, larger **Stream** mode (mount immediately, `useSuspenseQuery`
  suspends inside `<Suspense>`) would trade away invariant #3 by construction, so
  it's the non-preferred track. See "Part 2 design" below.

## Part 2 design: instant without the flash

Part 2 was explored with throwaway runtime probes (not shipped). Three facts came
out of them, and they define the whole problem.

### What the probes measured

Using `expectInstantNavigation`-style MutationObserver counting on a
same-component cache-hit switch (`/items?id=1` → `?id=2`, valid ids):

| Runtime variant | `Loading...` frames |
| --- | --- |
| shipped (part 1) | **1** — the flash |
| optimistic hold: drop the synchronous reset, defer the `loading` commit to a microtask (skip it if the loader already settled), and relax the render gate to component-only | **0** — instant |
| …same optimistic hold, but navigating to an **invalid** id | crash returns |

So two things are now known for certain:

1. **Instant is achievable without Suspense.** Because a cache hit resolves the
   loader within a microtask, deferring the `loading` commit means React never
   commits a loading frame — the page swaps straight from the old render to the
   new one. (This corrects the earlier assumption that part 2 needed a
   `<Suspense>`/held-render mechanism.)
2. **Instant and the crash fix are in direct tension.** Both are answers to "what
   do we show while the loader re-runs on a same-component nav?" — and they want
   opposite things:
   - crash fix → show the **fallback** (safe: the page never renders an
     unvalidated param);
   - instant → let the page **render the new param immediately** (fast, but an
     invalid param crashes because the component reads `router.query` directly,
     before the loader validates it).

### Why it's fundamental

The page reads `router.query` **directly** (`const id = router.query.id`). The
runtime cannot let React render the page with a param the loader hasn't validated,
yet it also cannot show a fallback without a frame. The only way to have both is to
**keep showing the last validated render until the loader settles the new one** —
not the *live* component (it would re-read the new `router.query` and crash), but a
frozen snapshot of the previous ready output.

### Rejected candidate: hold the last-ready `children` element

The natural idea: keep the gate at `readyPath === router.asPath`, but when it's
false render a saved snapshot of the last ready `children` instead of the fallback,
then swap to the live children once the loader commits the new `readyPath`.

**A probe rejected this.** Saving the previous `children` element in a ref and
rendering it while the gate is false still **crashes** on an invalid-id nav:

```tsx
const lastChildrenRef = useRef(null);
if (isReady) lastChildrenRef.current = children;
// gate false → render lastChildrenRef.current  ← still crashes on /items?id=999
```

A React element is a render instruction, not a snapshot. Rendering the saved
element re-invokes `ItemsPage`, which calls `useRouter()` and reads the **new**
`?id=999` — the same crash. So **nothing reachable through `_app`'s `children` can
be frozen**: the page owns its `useRouter()` read, and the runtime sits above it
with no way to pin what the page sees.

### Why part 2 is blocked in the current architecture

To have both instant *and* safe, the page must not observe a param the loader
hasn't validated — but the page reads `router.query` **directly**, outside the
runtime's control. The only mechanisms that would actually work each cost more than
the 1-frame flash is worth:

- **Controlled location** — the page reads a runtime-owned query (e.g.
  `useLoaderQuery()`) instead of `useRouter()`. This works, but it changes **every
  page's code** and undoes the library's core pitch ("attach a loader to an
  ordinary Next page"). It also can't be enforced — a stray `useRouter()` re-opens
  the crash.
- **DOM snapshot** — clone the previous subtree's DOM and hold it outside React
  until the loader settles. Hacky, breaks events/focus/accessibility, and fights
  React's ownership of the DOM.

Given part 1 already fixed the real bug (the crash / invariant-#3 violation) and
part 2 is a cosmetic 1-frame flash, the cost/benefit doesn't justify either path in
the current architecture. Part 2 is **parked**, with the probe results above so a
future attempt starts from these facts rather than re-deriving them.

If it's ever revisited, an opt-in `mode: 'stream'` scoped to controlled-location
pages is the least-bad route — the API cost is contained to pages that opt in.

### Sketch: `useLoaderQuery` (only if justified by more than the flash)

Removing the flash alone does **not** justify a controlled location — it's a
cosmetic one-frame issue, the library has no users yet, and "the flash bothers me"
is a hypothesis (derived from Next 16.3), not reported demand. Building a
page-facing API on that basis just adds unproven surface. So this is a sketch, not
a plan.

It becomes worth building only when framed as a **feature in its own right**, with
the flash fix as a byproduct:

- **Typed search params, extended to the component.** `defineLoader<TQuery>`
  already types the query *inside the loader*; `useLoaderQuery<{ id: string }>()`
  would extend that typed, runtime-owned query *to the page* — where today the page
  falls back to untyped `router.query`.
- **Router-controlled reads, à la TanStack Router.** TanStack's `Route.useSearch()`
  is exactly a router-owned query; adopting the same shape keeps the
  [migration path](./migrating-to-tanstack-router.md) conceptually aligned.
- **Flash removal falls out.** Because the runtime owns the query the page reads, it
  can withhold the new params until the loader validates them — so a same-component
  cache-hit switch commits with no loading frame, and an invalid param never reaches
  the page. Both part-2 goals, for free, *once the page reads `useLoaderQuery`
  instead of `useRouter`*.

Rough shape, opt-in per page:

```tsx
// Runtime provides the validated query via context; the page reads it instead of
// useRouter(). The runtime updates the context only after the loader settles.
ItemsPage.loaderMode = 'stream';
export default function ItemsPage() {
  const { id } = useLoaderQuery<{ id: string }>(); // runtime-owned, always valid
  const { data: items } = useSuspenseQuery(itemsQuery());
  const selected = items.find((i) => i.id === id)!; // safe: id is loader-validated
  // ...
}
```

Cost, stated honestly: it's a real page-facing API, it can't be *enforced* (a stray
`useRouter()` in a stream page re-opens the crash — needs at least an ESLint rule,
maybe a dev warning), and it partly duplicates `next/router`. Worth it for typed
params + alignment; not worth it for the flash. Revisit when a user asks for either
typed params or an instant same-component switch — not before.

### Not this: mount-before-loader Stream

A true 16.3-style **Stream** mode (mount the page immediately, let
`useSuspenseQuery` suspend inside a `<Suspense>` boundary) is a different, larger
change. It trades away invariant #3 by construction — the component mounts before
the loader can redirect — so it needs an explicit opt-in and a 2-phase loader
(redirect decision blocking, data streaming). The snapshot-hold approach above is
preferred because it keeps #3 intact; Stream stays a separate future track.

## Test hooks

- [`e2e/same-component-stale-param.spec.ts`](../e2e/same-component-stale-param.spec.ts)
  — `fixed = true`: asserts the navigation redirects without crashing (part 1).
- [`e2e/instant-navigation.spec.ts`](../e2e/instant-navigation.spec.ts) — now
  asserts the same-component cache-hit switch is instant (0 loading frames) on the
  `instant`-mode ItemsPage, and that a cold cross-component nav still shows the
  fallback.
- [`expectInstantNavigation`](../e2e/utils.ts) — the MutationObserver-based
  helper both specs use to catch even a single-frame fallback.
