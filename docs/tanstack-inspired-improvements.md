# TanStack Router-inspired improvements

A design note distilling [*TanStack's mental model for Next.js developers*][article]
into concrete, phased work for this library. It records what maps cleanly, what
does not port to `output: 'export'`, and the order we intend to build the parts
that do.

[article]: https://www.adarsha.dev/blog/tanstack-mental-model-for-nextjs-developers

## What already maps (no work)

Most of the article is already reflected here — see
[migrating-to-tanstack-router.md](./migrating-to-tanstack-router.md) for the full
table. In short:

- `ensureQueryData` (loader) → `useSuspenseQuery` (component) is invariant #4.
- `RedirectError` ↔ `redirect({ to })`, same throw-from-loader semantics.
- `useLoaderPhase()` ↔ `router.state.status`.
- `<PrefetchLink>` ↔ `<Link preload>`.

## What does not port

- **Isomorphic loaders / `createServerFn` / middleware.** These assume a server
  execution context. `output: 'export'` is 100% CSR — there is no server half, so
  the whole "loaders run on server during SSR, on client after" model collapses to
  "always client". Nothing to adopt. (SPEC.md Non-goals: no server-only mode.)
- **`routeTree.gen.ts` type contract.** Codegen over a route tree conflicts with
  this library's core pitch: attach a loader to an *ordinary* Next page. We do not
  own routing (SPEC.md Non-goals), so there is no tree to generate from.

## What is worth borrowing

Three ideas, ranked by fit to the invariants. The first two converge on a single
new primitive (a runtime-owned, validated query); the third is independent.

### A. Validated, runtime-owned search params (`validateSearch` + `useLoaderQuery`)

TanStack's `validateSearch` makes the query the **output of a validator**, so it is
typed *and* coerced at the route boundary:

```ts
validateSearch: z.object({ page: z.number().catch(1) })  // invalid → 1, never crashes
```

This library today does the opposite: the page reads untyped `useRouter().query`
and the loader hand-casts (`query.id as string`). That asymmetry is the root of two
known gaps:

1. **No typed params in the component.** SPEC.md "알려진 한계" #5 and the
   `useLoaderQuery` sketch in [instant-navigation.md](./instant-navigation.md#L215)
   both point here.
2. **The instant-navigation flash (part 2).** Because the page reads
   `router.query` *directly*, the runtime cannot withhold an unvalidated param —
   which is exactly why part 2 is parked. If the page instead reads a
   **runtime-owned** query that the runtime only updates once the loader settles,
   the flash and the invalid-param crash both dissolve *without* Suspense. See
   instant-navigation.md "Part 2 design".

`.catch()`-style coercion is also a **lighter alternative to redirect-on-invalid**:
today an invalid `?id` must `throw new RedirectError` (or crash); a validator can
coerce it to a valid default before it ever reaches the component.

This is the flagship. It is built bottom-up in phases 1–3 below.

### B. `beforeLoad` / `loader` phase split

TanStack splits guard/redirect decisions (`beforeLoad`) from data fetching
(`loader`). This library bundles both into one `LoaderFn` and enforces
"redirect-first" by convention.

Splitting them makes invariant #3 (redirect decided before mount) **structural
rather than conventional**, and it is the prerequisite the parked Stream mode
already named ("2-phase loader: redirect decision blocking, data streaming" —
instant-navigation.md). Deferred to phase 4; revisit alongside any Stream work.

### C. `<PrefetchLink>` should run the loader, not a hand-listed query set

TanStack's `<Link preload="intent">` runs the destination route's **actual
loader** on intent. Our `PrefetchLink` takes a **manual** `prefetch={[itemsQuery()]}`
list ([prefetch-link.tsx](../packages/next-export-loader/src/prefetch-link.tsx#L46))
that can drift from the target page's real loader. Independent, small; phase 5.

## Phased plan

Each phase is self-contained, ships with tests, and updates SPEC.md when it adds
public API. Invariants are never weakened without an explicit opt-in.

| Phase | Deliverable | Invariant impact | Status |
|---|---|---|---|
| 1 | `defineLoader({ validate, load })` — validated/typed/coerced `ctx.query` | strengthens #3 (coerce as redirect alternative); none weakened | **done** |
| 2 | `useLoaderQuery()` — runtime-owned validated query, read by the page | none (non-stream: same gating as today) | **done** |
| 3 | Instant same-component switch on cache hit (opt-in stream on controlled-location pages) | closes the part-2 flash; keeps #3 because the page reads validated query, not `router.query` | planned |
| 4 | `beforeLoad` redirect-phase split | makes #3 structural | deferred |
| 5 | `PrefetchLink` accepts the target loader (drift fix) | none | deferred |

### Phase 1 — `validate` in `defineLoader` (this note's first build)

Add an object form to `defineLoader` that carries a validator:

```ts
// existing bare-function form still returns the same function (identity)
defineLoader(async (ctx) => { ... });

// new object form
defineLoader({
  validate: (raw) => ({ id: (raw.id as string) ?? undefined, page: Number(raw.page ?? 1) }),
  load: async ({ query }) => {
    query.page; // number, validated — not `raw.page as string`
  },
});
```

Design:

- `LoaderFn<TQuery>` becomes a callable interface with an optional `validate`
  property. `TQuery` is no longer constrained to `ParsedUrlQuery` — the validated
  shape may hold numbers/enums (the whole point of `validateSearch`). The raw input
  to `validate` is always `ParsedUrlQuery`.
- `defineLoader(fn)` returns `fn` unchanged (preserves the existing identity test).
  `defineLoader({ validate, load })` returns `load` with `.validate` attached.
- `LoaderRuntime` computes `query = loader.validate ? loader.validate(raw) : raw`
  before calling the loader, so `ctx.query` is the validated shape. If `validate`
  throws, it surfaces as the error phase (same as any loader throw); coercion via
  `catch`-style fallbacks is the user's choice.

Phase 1 does **not** yet expose the validated query to the component — that is
phase 2 (`useLoaderQuery`). Phase 1's value on its own: typed, validated,
coerced query *inside the loader*, replacing hand-casts.

## Why this order

Phases 1→2→3 build the same primitive bottom-up: validate the query (1), let the
runtime own and expose it (2), then let the runtime withhold it across a
same-component switch to kill the flash (3). Each is useful shipped alone. Phase 3
is the parked part-2 work, now unblocked because phases 1–2 move the page off
`useRouter().query` onto a runtime-owned read — the exact precondition
instant-navigation.md identified as missing. Phases 4–5 are independent and can
land any time.
