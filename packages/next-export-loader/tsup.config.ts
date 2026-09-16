import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'eslint-plugin': 'src/eslint-plugin.ts',
    devframe: 'src/devframe/page-script.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next', '@tanstack/react-query', 'devframe'],
});
