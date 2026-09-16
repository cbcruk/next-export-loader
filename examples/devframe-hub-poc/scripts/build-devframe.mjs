import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createUi } from '@devframes/hub-ui';
import { buildHub } from '@devframes/hub/build';
import { defineDevframe } from 'devframe';
import { build } from 'esbuild';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const panelDist = here('../.devframe/panel');

await mkdir(panelDist, { recursive: true });
await build({
  entryPoints: [here('../devframe/panel/main.ts')],
  outfile: `${panelDist}/main.js`,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
});
await copyFile(here('../devframe/panel/index.html'), `${panelDist}/index.html`);

const loaderDevframe = defineDevframe({
  id: 'next-export-loader',
  name: 'next-export-loader',
  version: '0.1.0',
  packageName: 'next-export-loader',
  homepage: 'https://github.com/cbcruk/next-export-loader',
  description: 'Loader navigations: phase, duration, redirects, errors.',
  icon: 'ph:path-duotone',
  importMetaUrl: import.meta.url,
  clientAssets: panelDist,
  setup() {},
});

await buildHub({
  outDir: here('../public/__devframes'),
  devframes: [loaderDevframe],
  ui: createUi(),
});
