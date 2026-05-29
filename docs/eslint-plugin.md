# ESLint plugin

`next-export-loader` ships an ESLint plugin that enforces the library's core
contract: a page component reads loader-prefetched data with `useSuspenseQuery`,
never `useQuery`. The plugin lives at the `next-export-loader/eslint-plugin`
subpath — there is no separate package to install.

## Why

A loader prefetches into the query cache; the component reads it back as a cache
hit via `useSuspenseQuery`. If you reach for `useQuery` instead, the component
no longer relies on the loader's guarantee — and a typo in the query key spawns
a second, independent fetch. The `no-use-query` rule makes that mistake a lint
error. See [SPEC.md](../SPEC.md) for the full rationale.

## Requirements

- ESLint 9+ (flat config — `eslint.config.js`/`.mjs`)
- A parser that understands your source. For TypeScript/TSX, use
  [`@typescript-eslint/parser`](https://typescript-eslint.io/).

## Setup

The plugin's default export is a flat-config plugin object exposing a
`recommended` config, so the quickest setup is one line:

```js
// eslint.config.mjs
import nextExportLoader from 'next-export-loader/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['pages/**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
  },
  nextExportLoader.configs.recommended,
];
```

> Name the file `eslint.config.mjs` (or set `"type": "module"`) so the `import`
> syntax is treated as ESM.

### Manual wiring

If you'd rather register the rule yourself:

```js
import nextExportLoader from 'next-export-loader/eslint-plugin';

export default [
  {
    files: ['pages/**/*.{ts,tsx}'],
    plugins: { 'next-export-loader': nextExportLoader },
    rules: { 'next-export-loader/no-use-query': 'error' },
  },
];
```

A working setup lives in
[`examples/basic-list-detail`](../examples/basic-list-detail/eslint.config.mjs)
(`pnpm --filter example-basic-list-detail lint`).

## Rules

### `no-use-query`

Disallows importing `useQuery` from `@tanstack/react-query`. Use
`useSuspenseQuery` instead.

```ts
// ✗ error
import { useQuery } from '@tanstack/react-query';

// ✓ ok
import { useSuspenseQuery } from '@tanstack/react-query';
```

**Limitation:** the rule matches the named import specifier, so it flags
`import { useQuery } from '@tanstack/react-query'`. It does not catch namespace
access (`import * as rq … rq.useQuery()`) or a `useQuery` re-exported through
another module.
