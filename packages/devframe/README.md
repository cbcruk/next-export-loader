# next-export-loader-devframe

Docks the [next-export-loader](../../README.md) navigation log into a [devframe](https://devfra.me) hub. Experimental.

It is built for Pages Router apps with `output: 'export'`: the hub is baked as static files into `public/__devframes/`, so it needs no server or API route. The panel reads navigations from `mountLoaderPageScript` (`next-export-loader/devframe`) over devframe's in-page channel.

## Setup

```bash
pnpm add devframe
pnpm add -D next-export-loader-devframe
```

```jsonc
// package.json
"predev": "next-export-loader-devframe build",
"prebuild": "next-export-loader-devframe clean"
```

```js
// next.config.js
const { withLoaderDevframe } = require('next-export-loader-devframe/next');

module.exports = withLoaderDevframe({ output: 'export', trailingSlash: true });
```

```tsx
// pages/_app.tsx
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  void import('next-export-loader/devframe').then((m) => m.mountLoaderPageScript());
}

// pages/_document.tsx, inside <body>
{process.env.NODE_ENV === 'development' && (
  <script type="module" src="/__devframes/embedded.js" />
)}
```

Add `public/__devframes/` to `.gitignore`.

## API

| Export | Description |
|---|---|
| `buildLoaderHub(options?)` | Bakes the hub with the loader panel into `public/__devframes` (`outDir`, `basePath`, extra `devframes`). |
| `cleanLoaderHub(options?)` | Removes the baked hub. |
| `createLoaderDevframe()` | The devframe definition, for mounting into your own hub. |
| `withLoaderDevframe(config)` (`/next`) | In development, rewrites the hub's directory URLs to `index.html` for `next dev`. Returns the config unchanged otherwise. |

CLI: `next-export-loader-devframe build [--out-dir <dir>] [--base-path <path>]` and `next-export-loader-devframe clean [--out-dir <dir>]`. `--base-path` defaults to `$NEXT_BASE_PATH`.

## Caveats

- Call `mountLoaderPageScript` from the app bundle. Loaded any other way (for example as a hub client script) it observes an empty store.
- Without `trailingSlash: true`, `withLoaderDevframe` sets `skipTrailingSlashRedirect: true` in development so the hub's relative asset paths resolve.
- The hub UI fetches icons from `api.iconify.design`.
