# next-export-loader

> Pages Router + `output: 'export'` 환경에서 서버 라우트 lifecycle을 흉내내기 위한 thin orchestrator

## 한 줄 요약

데이터가 준비된 뒤에 컴포넌트가 mount된다는 invariant를 클라이언트에서 강제하여, "fetch 결과 → URL/state 동기화" 류의 useEffect 패턴을 제거한다.

## 왜 만드는가

### 문제

`next export` (정적 호스팅) 환경은 SSR/RSC의 이점을 받을 수 없는 100% CSR임에도, Next.js라는 프레임 때문에 마치 안전한 것처럼 오인된다. 실제로 다음 패턴이 반복적으로 등장한다:

1. 페이지 진입 → `useQuery`로 list fetch
2. `useEffect`로 first item을 selected로 설정 → URL searchParam 갱신
3. 다른 컴포넌트가 URL을 source of truth로 읽음
4. race condition, 초기 렌더 깜빡임, useEffect dependency 지옥

TanStack Query 메인테이너 TkDodo가 v5에서 `onSuccess`/`onError` 콜백을 제거하면서 말한 핵심은 "state syncing은 anti-pattern이다, derive하라"인데, CSR 환경에서 이 철학을 실제로 살리려면 **fetch와 render 사이에 명시적 phase boundary**가 필요하다. 서버 환경에서는 이 boundary가 await 한 줄로 공짜로 주어지지만 CSR에는 없다.

App Router는 이 문제를 native로 해결한다 (`redirect()`, server `loader`). 하지만 다음의 경우 Pages Router + export에 머무를 수밖에 없다:

- WebView 기반 데스크탑/모바일 앱 (Tauri, Electron, WebView2, WKWebView)
- 사내 도구 / admin 대시보드 (인증 뒤편, 정적 호스팅 선호)
- App Router로 마이그레이션 비용이 비대칭적으로 큰 레거시
- GitHub Pages, S3+CloudFront 등 정적 호스팅 환경

### 해법

페이지 단위로 `loader` 함수를 정의할 수 있게 하고, `_app.tsx`가 navigation lifecycle을 가로채 loader를 await한 뒤에 컴포넌트를 렌더한다. 서버 환경의 lifecycle을 클라이언트에서 흉내내는 thin runtime이다.

## 핵심 invariant

라이브러리가 보장하는 것 (사용자가 이 위에서 코드를 짤 수 있는 전제):

1. **컴포넌트가 mount될 때, 해당 페이지의 loader는 이미 완료되었다.**
2. **loader 내에서 `throw new RedirectError(...)`로 redirect할 수 있다.** 컴포넌트는 redirect 이후 상태에서 mount된다.
3. **`useSuspenseQuery`로 loader가 prefetch한 데이터를 fetch 없이 즉시 읽을 수 있다.** (캐시 hit)
4. **navigation이 빠르게 연속 발생할 때, 이전 loader 결과는 무시된다.** race condition 없음.

## 4-layer 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  URL Layer        next/router, searchParams = SoT        │
├─────────────────────────────────────────────────────────┤
│  Loader Layer     page.loader, RedirectError throw       │  ← 서버 loader 대응
├─────────────────────────────────────────────────────────┤
│  Query Cache      TanStack Query, queryOptions           │
├─────────────────────────────────────────────────────────┤
│  Render Layer     useSuspenseQuery + Suspense boundary   │  ← 데이터 보장된 상태에서만 진입
└─────────────────────────────────────────────────────────┘
```

각 레이어의 책임:

| 레이어 | 책임 | 금지 |
|---|---|---|
| URL | navigation의 입력 표현 | fetch 결과로 갱신하지 않음 (사용자 액션으로만) |
| Loader | 데이터 prefetch, URL invariant 보장, redirect | UI 렌더링 |
| Query Cache | 단일 데이터 정의 (`queryOptions`) | loader/컴포넌트 둘 다 같은 객체 참조 |
| Render | derive + 사용자 인터랙션 | `useEffect`로 데이터 sync, 컴포넌트에서 navigation |

## 핵심 API

### `defineLoader<T>(loader)`

페이지 loader를 정의한다. ctx에서 type-safe하게 `query`, `queryClient`, `signal`을 받는다.

```ts
import { defineLoader } from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

export const loader = defineLoader(async ({ query, queryClient, signal }) => {
  const items = await queryClient.ensureQueryData({
    ...itemsQuery(),
    signal,
  });

  if (!query.id && items.length > 0) {
    throw new RedirectError(`/items?id=${items[0].id}`);
  }
});
```

**Object form (`{ validate, beforeLoad, load }`).** raw query를 loader 실행 전에 검증하거나(→ `validate`), redirect·가드를 데이터 페칭과 분리하고 싶으면(→ `beforeLoad`) object form을 쓴다. runtime은 mount 전에 **`validate` → `beforeLoad` → `load`** 순으로 실행한다.

- `validate(raw)` — `ctx.query`를 검증된 shape(숫자·enum 등)로 만든다. TanStack Router의 `validateSearch`에 대응. invalid param을 던지지 않고 유효 default로 coerce하면 redirect-on-invalid의 가벼운 대안이 된다.
- `beforeLoad(ctx)` — redirect·access 가드 phase. **데이터 페칭 전에** 실행되므로, 권한 없는 navigation은 loader를 트리거하지 않고 곧장 redirect된다. TanStack Router의 `beforeLoad`에 대응. loader와 데이터 공유는 return 값이 아니라 query cache로 한다. 이로써 invariant #3(redirect는 mount 전 결정)이 컨벤션이 아닌 **구조**로 표현된다.

```ts
export const loader = defineLoader<{ page: number }>({
  validate: (raw) => ({ page: Number(raw.page ?? 1) }), // invalid → 1, 크래시 없음
  beforeLoad: () => {
    if (!isAuthenticated()) throw new RedirectError('/login'); // 페치 전에 가드
  },
  load: async ({ query, queryClient }) => {
    query.page; // number, 검증됨
    await queryClient.ensureQueryData(itemsQuery(query.page));
  },
});
```

### `RedirectError`

loader 내부에서 redirect를 표현하는 throw-able. 서버 환경의 `redirect()` status code와 같은 의미적 무게.

```ts
throw new RedirectError(destination: string, options?: { replace?: boolean });
```

`replace: true`가 default (사용자 history를 더럽히지 않기 위해).

### `<LoaderRuntime>`

`_app.tsx`에서 children을 감싸는 provider. navigation lifecycle을 가로채 loader를 실행한다.

```tsx
import { LoaderRuntime } from 'next-export-loader';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <LoaderRuntime
        Component={Component}
        fallback={<PageSkeleton />}
        errorFallback={<ErrorView />}
      >
        <Component {...pageProps} />
      </LoaderRuntime>
    </QueryClientProvider>
  );
}
```

### `useLoaderPhase()`

현재 phase를 조회 (`'loading' | 'ready' | 'error'`). 일반적으로 직접 쓸 일은 없고, 글로벌 progress bar 같은 곳에서만 사용.

### `useLoaderQuery<T>()`

runtime이 소유한 **검증된 query**를 컴포넌트에서 읽는다. loader가 `validate`를 정의했으면 그 typed 결과를, 아니면 raw `ParsedUrlQuery`를 반환한다. 컴포넌트는 loader가 `ready`된 뒤에만 mount되므로, 반환값은 항상 현재 URL에 대해 loader가 검증한 값이다 — 페이지가 미검증 param을 보는 일이 없다. TanStack Router의 `Route.useSearch()`에 대응하며, 페이지에서 `useRouter().query`(untyped) 대신 쓴다.

```tsx
export default function ItemsPage() {
  const { id } = useLoaderQuery<{ id: string }>(); // typed, loader-validated
  const { data: items } = useSuspenseQuery(itemsQuery());
  const selected = items.find((i) => i.id === id)!;
}
```

### `Page.loaderMode`

페이지 컴포넌트에 붙이는 opt-in 렌더 정책. `'block'`(기본) | `'instant'`.

- `'block'` — same-component param 변경 시 loader가 새 param에 대해 settle될 때까지 `fallback`을 보여준다. 어떤 페이지든 안전하지만 cache hit switch도 한 프레임 fallback이 깜빡인다.
- `'instant'` — loader가 settle될 때까지 **직전 검증된 렌더를 유지**한다(페이지가 이전 `useLoaderQuery` 값을 계속 읽음). cache hit switch는 loading 프레임 없이 즉시 전환되고, invalid param은 페이지에 도달하기 전에 loader가 redirect한다(invariant #3 유지). **반드시 `useLoaderQuery`로 param을 읽는 페이지에만 사용** — `useRouter().query`를 직접 읽으면 미검증 param 크래시가 다시 열린다.

```tsx
ItemsPage.loaderMode = 'instant';
```

Next.js 16.3의 "instant navigation" 야드스틱(자체 loading 프레임이 없으면 instant)을 `output: 'export'` 환경에서 만족시키는 방법. 배경은 [docs/instant-navigation.md](docs/instant-navigation.md).

### `<PrefetchLink>`

`next/link` 위에 hover/focus 시 `queryClient.prefetchQuery` 호출을 얹은 컴포넌트. `next/link`의 chunk prefetch와 데이터 prefetch를 통합.

```tsx
<PrefetchLink href="/items" prefetch={[itemsQuery()]}>
  View items
</PrefetchLink>
```

## 페이지에서의 사용 모습

```tsx
// pages/items.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader, RedirectError, useLoaderQuery } from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

interface ItemsQuery {
  id?: string;
}

export const loader = defineLoader<ItemsQuery>({
  validate: (raw) => ({ id: typeof raw.id === 'string' ? raw.id : undefined }),
  load: async ({ query, queryClient, signal }) => {
    const items = await queryClient.ensureQueryData({ ...itemsQuery(), signal });

    if (!query.id && items.length > 0) {
      throw new RedirectError(`/items?id=${items[0].id}`);
    }
    if (query.id && !items.some((i) => i.id === query.id)) {
      throw new RedirectError(`/items?id=${items[0].id}`);
    }
  },
});

export default function ItemsPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const { id: selectedId } = useLoaderQuery<ItemsQuery>();
  const selected = items.find((i) => i.id === selectedId)!;
  // selectedId와 selected는 loader가 보장. fallback/조건 분기 불필요.

  return <ItemsLayout items={items} selected={selected} />;
}
```

`useEffect` 없음, 조건 분기 없음, fallback 분기 없음. 페이지는 `useRouter().query`(untyped) 대신 `useLoaderQuery<T>()`로 loader가 검증한 typed query를 읽는다.

## 패키지 구조

```
next-export-loader/
├── packages/
│   └── next-export-loader/
│       ├── src/
│       │   ├── index.ts                 ← public API barrel
│       │   ├── types.ts                 ← public 도메인 타입 (LoaderContext 등)
│       │   ├── define-loader.ts
│       │   ├── redirect-error.ts
│       │   ├── loader-runtime.tsx       ← <LoaderRuntime>
│       │   ├── loader-devtools.tsx      ← <LoaderDevtools>
│       │   ├── prefetch-link.tsx
│       │   ├── use-loader-phase.ts
│       │   ├── eslint-plugin.ts         ← no-use-query rule
│       │   ├── *.test.ts                ← node:test, co-located
│       │   └── internal/
│       │       ├── parse-url.ts
│       │       ├── navigation-id.ts     ← race 방지용
│       │       ├── devtools-store.ts
│       │       ├── types.ts             ← internal 전용 타입
│       │       └── *.test.ts
│       ├── package.json
│       └── tsup.config.ts
│
├── examples/
│   ├── basic-list-detail/               ← 메인 예시 (첫 아이템 default selected)
│   ├── search-with-suggest/             ← searchParam-driven query
│   ├── auth-gated/                      ← redirect 패턴
│   └── dynamic-routes/                  ← query-param 페이지의 errorFallback
│
├── e2e/                                 ← Playwright (정적 export 대상)
│   ├── *.spec.ts
│   ├── utils.ts                         ← zero-dep 정적 서버 harness
│   └── global-setup.ts
│
├── docs/
│   ├── eslint-plugin.md
│   └── migrating-to-tanstack-router.md
│
├── README.md
├── SPEC.md                              ← this file
├── CLAUDE.md
├── playwright.config.ts
├── pnpm-workspace.yaml
└── package.json
```

## 로드맵

### Phase 1 — Minimum viable

목표: 핵심 invariant를 만족하는 동작하는 라이브러리.

- [x] `defineLoader`, `RedirectError`, `LoaderRuntime` 구현
- [x] navigation race 방지 (navigation id 패턴)
- [x] `examples/basic-list-detail` 동작
- [x] README + SPEC.md + CLAUDE.md
- [ ] Phase 1 publish (npm, GitHub) — GitHub 공개 진행 중, npm publish 미진행

### Phase 2 — Practical

목표: 실전 사용에 필요한 디테일.

- [x] `<PrefetchLink>` (hover/focus prefetch)
- [x] AbortSignal 통합 (`LoaderContext.signal` 제공; loader가 `ensureQueryData`에 forward) — runtime은 navigation 취소 시 abort. examples는 아직 signal을 forward하지 않음
- [x] `useLoaderPhase()` + 글로벌 progress 예시 (basic-list-detail ProgressBar)
- [x] ESLint rule: `no-use-query` (`useSuspenseQuery`만 허용)
- [x] `examples/` 나머지 3개

### Phase 3 — Polish

- [x] Devtools (현재 phase, navigation log, redirect chain 시각화)
- [x] TanStack Router로의 마이그레이션 가이드 (졸업 경로)
- [x] `defineLoader` 결과의 search params 타입 추론 강화
- [x] Playwright e2e (정적 export 대상, invariant별 커버)

## Non-goals

명시적으로 하지 않는 것들. scope creep을 막기 위함:

- **App Router 지원**: App Router는 이 문제를 native로 풀고, 우리는 Pages Router에 특화한다.
- **자체 routing**: `next/router`를 대체하지 않는다. 위에 얹는다.
- **자체 query client**: TanStack Query에 의존한다. 자체 캐시를 만들지 않는다.
- **server-only mode**: SSR 환경에서는 그냥 `getServerSideProps` / App Router를 써라.
- **search params 검증**: zod 등을 강제하지 않는다. 단, `defineLoader`의 object form이 optional `validate` hook을 제공하므로 사용자가 원하는 검증 라이브러리(zod 등)를 자유롭게 꽂을 수 있다 (강제 아님).
- **data mutation**: useMutation은 그대로 TanStack Query를 쓴다.

## 알려진 한계 (정직하게 명시)

1. **Cold load 첫 페인트의 빈 화면.**
   JS bundle parse → loader 실행 → render 사이클을 사용자가 그대로 본다. 이건 CSR의 본질적 비용이며, 라이브러리가 해결할 수 없다. SSR이 정확히 이 갭을 메우는 것이고, 이게 필요하면 App Router를 써야 한다.

2. **`routeChangeStart` cancel 불가.**
   Next.js Pages Router의 `routeChangeStart` 이벤트는 URL이 이미 바뀐 뒤에 발생한다. 따라서 loader phase 동안 "이전 페이지를 보여줄지, skeleton을 보여줄지"는 라이브러리가 정책적으로 결정해야 한다. 기본 정책: **skeleton**. 사용자가 `fallback` prop으로 커스텀 가능.

3. **두 개의 query cache 위험.**
   사용자가 실수로 `useQuery`를 쓰면 loader가 prefetch한 캐시와 별개의 fetch가 발생할 수 있다 (key가 같다면 dedup되지만, 실수로 key가 다르면 분기됨). ESLint rule이 Phase 2에서 이를 강제한다.

4. **`next/link` prefetch와의 통합 한계.**
   `next/link`의 prefetch는 chunk만 가져온다. 데이터 prefetch는 `<PrefetchLink>`를 써야 한다. 사용자가 일반 `<Link>`를 쓰면 hover 시 chunk만, 클릭 시 loader가 데이터 fetch — 즉 두 번의 latency가 직렬화될 수 있다.

5. **타입 안정성은 TanStack Router 수준에 못 미친다.**
   `defineLoader`의 `validate` + `useLoaderQuery<T>()`로 typed·검증된 query를 컴포넌트로 forward할 수 있지만(→ `Route.useSearch()`에 근접), `T`를 loader와 컴포넌트 양쪽에 수동으로 명시해야 한다. TanStack Router는 routeTree codegen으로 이를 자동 추론하는데, 자체 routing을 갖지 않는 이 라이브러리는 거기까지 갈 수 없다.

## 비교

| | next-export-loader | TanStack Router | App Router |
|---|---|---|---|
| 환경 | Pages + export | 모든 SPA | Next.js (server) |
| Loader 타입 추론 | 약함 | 강함 | 강함 |
| Server lifecycle | 흉내 | 흉내 | 진짜 |
| Migration 비용 | 낮음 (페이지 단위 도입) | 높음 (라우터 교체) | 매우 높음 |
| 정적 호스팅 | ✅ | ✅ | ❌ (SSR 필요) |

**언제 next-export-loader를 쓰는가?** Pages Router + export를 떠날 수 없는데 loader 패턴이 절실할 때. 위 셋 중 가장 좁은 niche이지만, 그 niche의 사용자에게는 가장 적합한 도구.

## References

- TkDodo, [Breaking React Query's API on purpose](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- TkDodo, [Seeding the Query Cache](https://tkdodo.eu/blog/seeding-the-query-cache)
- TanStack Query Discussion [#5279](https://github.com/TanStack/query/discussions/5279)
- TanStack Router [loader docs](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
- Remix [loader convention](https://remix.run/docs/en/main/route/loader)
