import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    dts: { entry: { index: 'src/index.ts' } },
    sourcemap: true,
    external: [/^@devframes\//, 'devframe', 'next-export-loader'],
  },
  {
    entry: { next: 'src/next.ts' },
    format: ['esm', 'cjs'],
    platform: 'node',
    target: 'node18',
    dts: true,
    sourcemap: true,
    external: ['next'],
  },
  {
    entry: { 'panel/main': 'src/panel/main.ts' },
    format: ['esm'],
    platform: 'browser',
    target: 'es2022',
    minify: true,
    noExternal: [/.*/],
    async onSuccess() {
      await copyFile('src/panel/index.html', 'dist/panel/index.html');
      await copyFile('src/panel/panel.css', 'dist/panel/panel.css');
    },
  },
]);
