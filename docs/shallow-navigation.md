# Shallow navigation — the loader-free same-component switch

A design note. Records an idea for the *other half* of the same-component
navigation problem, prompted by the [Next.js SPA guide][spaguide]'s
`shallow-routing` pattern.

[spaguide]: https://nextjs.org/docs/app/guides/single-page-applications

> **Update — prototype landed.** `shallowPush` now exists as an exported
> prototype, with the exact design below: match the armed target by value (trailing
> slash normalized), skip the loader in the runtime, advance the runtime-owned
> query with `validate` only, and hold the render like `instant`. It's exercised by
> the [`shallow-list-filter`](../examples/shallow-list-filter) example (a URL-backed
> sort/filter list) and pinned by
> [`e2e/shallow-list-filter.spec.ts`](../e2e/shallow-list-filter.spec.ts), which
> asserts a shallow sort/filter updates the view + URL with **no loader run and no
> loading frame**, while an ordinary navigation still runs the loader. The design
> reasoning below is preserved as what led there; treat "not shipped" framing as
> historical. Still a prototype — no ESLint enforcement yet, and the open questions
> at the end stand.

## TL;DR

- A same-component param change (`/items?id=1` → `?id=2`) comes in two flavors:
  1. **Data-changing** — the new param needs data the loader must (re)resolve.
  2. **View-only** — the new param just re-derives a view over data **already
     loaded** (select-among-loaded, sort, filter, tab).
- The shipped [`loaderMode: 'instant'`](./instant-navigation.md) makes flavor 1
  *flash-free*, but the loader **still runs on every switch** (an
  `ensureQueryData` cache hit plus the redirect/validation pass).
- For flavor 2 that loader run is pure overhead: there is no new data to fetch and
  no redirect to decide. The SPA guide's `shallow-routing` handles exactly this on
  the App Router — `pushState` updates `?sort=`, `useSearchParams` re-sorts, **no
  server request**. This note asks what the equivalent is here.
- **Idea:** an opt-in *shallow navigation* that updates the URL (and the
  runtime-owned query) **without running the loader**, safe because the new param
  is valid **by construction** — it was chosen from already-loaded data.

## Where it comes from

In the SPA guide the server has already streamed the list into the client cache.
Sorting or filtering that list is a client-only concern, so the URL update that
records it **must not** go back to the server — that's the whole point of shallow
routing. The mechanism is the browser History API (`window.history.pushState`)
plus `useSearchParams`, deliberately bypassing the App Router's data flow.

The shape maps onto this library one-to-one. Swap "server streamed the list" for
"the loader loaded the list": once `itemsQuery()` is in cache, choosing *which*
item is selected (`?id=`) is a client-only derive. Re-running the loader to do it
is the same redundant round-trip shallow routing exists to avoid — we just avoid a
loader lifecycle instead of a network request.

## The gap the shipped work leaves

`loaderMode: 'instant'` (see instant-navigation.md) is about *what the user sees*
during a same-component switch: hold the last validated render until the loader
settles, so there's no fallback frame. It does not change *whether the loader
runs* — it always does. That is correct and cheap for flavor 1, but for flavor 2
it means every view-only switch:

- runs `beforeLoad`/`load` that have nothing to do (redirect + validation logic
  that can't change the outcome when the value is known-valid),
- churns the navigation lifecycle — a new navId, phase transitions, devtools
  entries — for what is conceptually a `setState`,
- risks an unwanted background refetch if the query's `staleTime` happens to have
  lapsed mid-session, turning a pure view change into a network hit.

None of these are bugs. They're the cost of routing a client-only view change
through the data lifecycle, which shallow navigation would remove.

## Design sketch (opt-in, per navigation)

Shallowness is a property of the **transition**, not the page — the same
`ItemsPage` may switch `?id` shallowly (pick a loaded item) *or* deeply (a switch
that must load something). So the opt-in belongs on the navigation, not on
`Page.loaderMode`.

**Trigger.** A helper or link variant that marks the push shallow:

```tsx
import { shallowPush } from 'next-export-loader'; // sketch

// clicking a row selects an already-loaded item — no loader needed
<button onClick={() => shallowPush(`/items?id=${item.id}`)}>{item.title}</button>

// or a link variant
<ShallowLink href={`/items?id=${item.id}`}>{item.title}</ShallowLink>
```

**Runtime handling.** Pages Router's `router.push(url, undefined, { shallow: true })`
updates `router.query` without re-running data methods and fires its route-change
events with `shallow: true`. `LoaderRuntime`'s route-change handler would branch on
that flag: instead of starting a navigation (new navId → loader → phase churn), it
would **advance its own ready state directly**:

- keep `phase: 'ready'` (no fallback, no navId cancellation of unrelated work),
- set `readyPath` = the new `asPath`,
- recompute the runtime-owned query so `useLoaderQuery` sees the new param —
  running **`validate` only** (cheap, synchronous), **not** `beforeLoad`/`load`.

Running `validate` but skipping `beforeLoad`/`load` is the key line: it preserves
the typed, validated query contract (`useLoaderQuery<T>()` still returns a
validated `T`) while skipping the two phases that are the actual cost — data
fetching and the redirect guard.

## Invariant impact — and the one real tension

| Invariant | Under shallow nav |
| --- | --- |
| #1 loader awaited before mount | N/A — the component is already mounted; this is an in-place update, not a mount. |
| #2 latest navigation wins | Upheld — a shallow update still moves `readyPath` forward; a later real nav supersedes it as usual. Mixed shallow/deep ordering needs care (see open questions). |
| #3 redirect decided before render | **Deliberately not exercised.** Shallow nav skips `beforeLoad`, so no redirect guard runs. |
| #4 data is a cache hit | Upheld trivially — there is no fetch at all. |

The tension is entirely with #3. Skipping `beforeLoad` means a param that *would*
have triggered a `RedirectError` no longer can. That is acceptable **only** because
shallow nav is opt-in and carries a contract: *the caller asserts this transition
needs no guard and no new data* — you are moving within already-authorized,
already-loaded state. A param that could redirect (an unauthorized id, a missing
record) is **not** a shallow candidate; it must use a normal navigation so the
loader can guard it. This must be documented loudly, and probably backed by a dev
warning if a shallow nav lands on a param `validate` rejects (fall back to a full
loader run in that case, rather than render garbage).

## Interaction with the existing surface

- **`loaderMode: 'instant'`** — orthogonal and composable. `instant` = "the loader
  runs but never flashes"; shallow = "the loader doesn't run". A page can use both:
  shallow for view-only switches, normal (instant) nav for data-changing ones.
- **`useLoaderQuery`** — required for shallow nav to be *safe with types*. Because
  the runtime owns the query the page reads, it can update it via `validate` on a
  shallow switch. A page that reads `useRouter().query` directly would still get the
  new param (Pages Router updates it), but without the validation guarantee — the
  same footgun instant-navigation.md documents for `useRouter()`.
- **`<PrefetchLink>`** — moot for shallow targets: the data is already present, so
  there is nothing to warm.

## Open questions

1. **Should shallow run `validate`?** Recommended yes — it's synchronous and cheap,
   keeps `useLoaderQuery<T>()` typed, and gives a natural "invalid → fall back to a
   full loader run" escape hatch. The alternative (skip `validate` too) is faster
   but re-opens unvalidated-param reads.
2. **Mixed ordering.** A shallow update fired while a real loader is in flight:
   latest-wins must still hold. Likely rule — a real nav always supersedes a pending
   shallow update, and a shallow update issued after a real nav settles applies on
   top. Needs a probe.
3. **`staleTime` revalidation.** Shallow intentionally skips `ensureQueryData`, so it
   never triggers a background refetch. That's the desired semantics for a view-only
   change; if you *want* revalidation, the transition isn't shallow.
4. **Enforcement.** Like `loaderMode: 'instant'`, correctness leans on the page not
   reading `useRouter().query`. An ESLint companion to `no-use-query` could flag
   direct `router.query` reads on pages that use shallow nav.

## When to build

Not yet — same discipline as instant-navigation's part 2. The current path (loader
re-run + `instant` hold) is correct and cheap, the library has no users, and "the
loader re-run bothers me" is a hypothesis, not reported demand. This becomes worth
building when a concrete page has a **hot view-only param** — a URL-backed sort,
filter, or tab over an already-loaded set — where routing each change through the
loader shows up as real churn. The motivating example to build first: a list with
client-side sort/filter whose state lives in the URL (the direct analog of the SPA
guide's `shallow-routing` demo). Until then this note is the record, not a plan.
