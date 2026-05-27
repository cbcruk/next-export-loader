# CLAUDE.md

Claude Code가 이 저장소에서 작업할 때 따르는 규칙. SPEC.md가 "무엇을/왜"라면, 이 파일은 "어떻게 코드를 만지는가".

작업 시작 전에 반드시 이 파일과 SPEC.md를 읽는다. 의문이 생기면 사용자에게 묻기 전에 두 문서를 다시 본다.

## 프로젝트 컨텍스트 (한 문단)

`next-export-loader`는 Next.js Pages Router + `output: 'export'` 환경에서 서버 lifecycle을 흉내내는 thin runtime이다. 핵심은 "loader가 완료된 뒤에 컴포넌트가 mount된다"는 invariant 하나. 이 invariant를 깨는 코드는 어떤 정당화도 받아들이지 않는다.

## 절대 invariant (이걸 깨면 라이브러리 존재 의의가 사라짐)

1. **컴포넌트 mount 시점에 loader는 이미 await 완료되어 있다.**
   loader를 비동기로 띄워놓고 컴포넌트가 먼저 mount되면 안 됨. 이게 깨지면 그냥 useEffect로 돌아간 것.

2. **navigation race는 항상 가장 최근 것만 승리한다.**
   loader가 진행 중에 새 navigation이 발생하면, 진행 중인 loader의 결과는 폐기된다. navigation id 패턴 또는 AbortController로 구현.

3. **redirect는 컴포넌트 mount 전에 결정된다.**
   loader가 `RedirectError`를 throw하면 컴포넌트는 redirect 이후 URL의 loader로 다시 시작한다. 컴포넌트가 한 번 mount된 후 redirect되는 경우는 사용자 액션(event handler)에 의한 것뿐.

4. **loader의 데이터는 컴포넌트에서 `useSuspenseQuery`로 cache hit으로 읽힌다.**
   loader에서 `queryClient.ensureQueryData(opts)` → 컴포넌트에서 `useSuspenseQuery(opts)`로 같은 `opts` 참조. key가 같으므로 fetch 없이 즉시 반환되어야 함.

## 코딩 규칙

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true` 켠 상태로 작업.
- `any` 금지. 정말 필요하면 `unknown` + 타입 가드.
- public API (`src/index.ts`에서 export하는 것)는 모두 명시적 타입 export.
- 내부 유틸의 inferred type은 OK, public API의 inferred type은 금지.
- 제네릭 이름은 의미를 담음: `TData`, `TError`, `TQuery` 등. `T`, `U`, `V` 같은 단일 문자는 한 곳에 하나만 있을 때만.

### React

- `useEffect`는 다음 두 경우에만 허용:
  - `LoaderRuntime` 내부의 navigation lifecycle 가로채기 (라이브러리 본체)
  - 외부 시스템과의 진짜 sync (window resize, intersection observer 등)
- 사용자에게 `useEffect`를 강요하는 API는 만들지 않는다.
- 컴포넌트에서 `useQuery` 금지, `useSuspenseQuery`만. ESLint rule로 강제 (Phase 2).
- 함수 컴포넌트만. class 컴포넌트는 ErrorBoundary 한 곳에서만 (React가 강제).

### 파일 구조

- 한 파일에 하나의 주요 export. utility 함수가 한두 개 더 붙는 건 OK.
- 파일 이름은 kebab-case (`define-loader.ts`).
- React 컴포넌트 파일도 kebab-case 파일명에 PascalCase export (`loader-runtime.tsx` → `LoaderRuntime`).
- `internal/` 디렉터리에 있는 것은 절대 public API로 export하지 않음.

### 네이밍

- 함수: 동사로 시작 (`defineLoader`, `parseUrl`).
- 컴포넌트: 명사 (`LoaderRuntime`, `PrefetchLink`).
- 훅: `use` 접두사 (`useLoaderPhase`).
- 에러 클래스: `Error` 접미사 (`RedirectError`).
- 타입: 명사, prefix 없음 (`LoaderContext`, not `ILoaderContext`).
- boolean 변수: `is`, `has`, `should` 접두사.

## 데이터 페칭 규칙

라이브러리 본체와 examples 양쪽 모두에 적용.

1. **모든 query는 `queryOptions`로 정의한다.**
   ```ts
   export const itemsQuery = () => queryOptions({
     queryKey: ['items'],
     queryFn: fetchItems,
   });
   ```
   loader와 컴포넌트가 같은 객체를 import해서 사용. 인라인 `queryKey` 작성 금지.

2. **loader는 `ensureQueryData`를 쓴다.**
   `fetchQuery`는 stale 여부와 관계없이 항상 fetch라서 staleTime 정책을 무시한다. `ensureQueryData`는 cache hit 시 fetch 생략.

3. **컴포넌트는 `useSuspenseQuery`를 쓴다.**
   loader가 보장한 데이터를 사용한다는 의미를 코드에서 명시. `useQuery` + `if (!data) return null`은 invariant 위반.

4. **`select` 옵션은 컴포넌트에서만 사용 가능.**
   loader는 raw data를 prefetch한다. 변환은 컴포넌트의 책임. 같은 query를 여러 컴포넌트가 다르게 변환하는 경우를 막기 위함.

## 테스트 정책

- `node:test` + `node:assert/strict` 사용. jest/vitest 같은 무거운 러너 도입 금지 (Phase 3까지).
- 테스트 파일: `*.test.ts`, 같은 디렉터리.
- 핵심 invariant 테스트는 반드시 작성:
  - loader 미완료 시 컴포넌트가 mount되지 않는다
  - navigation race 시 이전 loader 결과가 버려진다
  - RedirectError throw 시 navigation이 발생한다
  - 같은 `queryOptions` 사용 시 컴포넌트에서 fetch가 발생하지 않는다
- UI 테스트는 examples에서만. 라이브러리 본체는 logic 테스트만.

## 의존성 정책

### peerDependencies (사용자 환경에 의존)

- `next` >= 13 (Pages Router 기준)
- `react` >= 18 (Suspense, useSyncExternalStore)
- `react-dom` >= 18
- `@tanstack/react-query` >= 5

### dependencies (라이브러리 자체)

**원칙: 0개를 목표.** 정말 필요할 때만 추가하고, 추가 이유를 PR description에 명시.

### devDependencies

- `typescript`
- `tsup` (빌드)
- `@types/*`
- 그 외 추가는 신중하게.

knip으로 unused dependency 검출 (Phase 2).

## 빌드

- `tsup`으로 ESM + CJS 듀얼 빌드.
- `"type": "module"`, `exports` field로 명시적 entry.
- tree-shakeable: side effect 없음, `"sideEffects": false` in package.json.
- 번들 크기 목표: minified+gzipped < 3KB (Phase 1 본체 기준). PR에 size 영향 명시.

## 커밋 컨벤션

Conventional Commits 사용:

- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서만 변경
- `refactor:` 동작 변경 없는 리팩토링
- `test:` 테스트만 추가/변경
- `chore:` 빌드/툴링

**breaking change는 `feat!:` 또는 `fix!:` 접두사 + footer에 `BREAKING CHANGE:` 명시.** Phase 1 이전(0.x)에서는 freely break OK. 1.0 이후로는 semver 엄격 준수.

## PR 작성 시

- 제목은 conventional commit 형식.
- description에 다음을 포함:
  - 무엇이 바뀌었는가
  - 왜 바뀌었는가 (SPEC.md의 어떤 부분과 연결되는지)
  - invariant 영향 여부
  - bundle size 영향 (`npx size-limit` 결과 첨부)
  - breaking change면 마이그레이션 가이드

## Claude Code가 자주 헷갈리는 결정들

이 섹션은 작업 중 의문이 들 때 참고하는 곳. 추가/수정은 발견할 때마다.

### Q. `useQuery`로 충분한 경우는 없나?

없다. 이 라이브러리의 핵심 가치 제안이 "loader가 데이터를 보장한다"이므로, 컴포넌트는 항상 `useSuspenseQuery`. 만약 컴포넌트가 optional data를 다뤄야 한다면, 그 데이터는 loader의 책임이 아닌 것이므로 별도 child 컴포넌트로 분리하고 거기서 `useSuspenseQuery` + 자체 loader.

### Q. loader 안에서 다른 loader를 호출할 수 있나?

직접은 안 됨. 공통 로직은 `defineLoader` 바깥의 일반 async 함수로 추출해서 양쪽 loader에서 호출. loader 자체가 "페이지에 부착되는 lifecycle"이라 호출 가능한 함수가 아님.

### Q. loader가 throw한 일반 Error는 어떻게 되나?

`<LoaderRuntime>`이 잡아서 `errorFallback`을 렌더한다. `RedirectError`는 특별 케이스로 navigation을 트리거하고, 그 외 모든 Error는 에러 phase로 전환. 에러를 throw하면 안 되는 곳에서는 try/catch로 명시적 처리.

### Q. SSR/SSG (`getStaticProps`)와 공존 가능한가?

가능. `getStaticProps`로 빌드 타임 데이터를 props로 받고, 추가 client-side 데이터를 loader로 prefetch. 둘은 직교 (orthogonal). 단, `getServerSideProps`는 `output: 'export'`에서 사용 불가하므로 고려할 필요 없음.

### Q. `next/dynamic`으로 lazy load한 컴포넌트의 loader는?

페이지 컴포넌트(`pages/*.tsx`의 default export)에서만 loader를 인식. lazy 컴포넌트 내부의 데이터는 자체적으로 `useSuspenseQuery`(Suspense 내) 또는 일반 `useQuery`로 처리. 페이지 loader는 페이지 단위의 invariant만 책임진다.

### Q. examples에서 어떤 디자인 시스템을 쓰나?

shadcn/ui 또는 plain CSS. 디자인 시스템 자체가 학습 부담이 되면 안 되므로 minimal. Phase 1은 plain CSS, Phase 2부터 shadcn 고려.

### Q. 한국어 문서?

README는 영어. SPEC.md, CLAUDE.md는 한국어 (메인테이너 편의). docs/ 내부는 영어를 default로 하되 한국어 버전도 환영.

## 작업 시작 전 체크리스트

새 기능/수정 작업을 시작할 때:

- [ ] SPEC.md의 어떤 섹션에 해당하는 작업인가? 명시되지 않은 작업이면 SPEC.md를 먼저 업데이트.
- [ ] 4개 invariant 중 어느 것에 영향이 있는가? 있다면 PR description에 명시.
- [ ] examples에 영향이 있는가? 있다면 examples도 함께 수정.
- [ ] 새 dependency 추가가 필요한가? 정말 필요한지 한 번 더 생각.
- [ ] 번들 크기 영향은? 의미 있는 증가라면 PR에 명시.

## 작업 완료 전 체크리스트

- [ ] 모든 테스트 통과 (`pnpm test`)
- [ ] 타입 체크 통과 (`pnpm typecheck`)
- [ ] 빌드 성공 (`pnpm build`)
- [ ] examples 빌드/실행 확인
- [ ] 새 API라면 SPEC.md에 반영
- [ ] 새 규칙/패턴이라면 이 파일(CLAUDE.md)에 반영
