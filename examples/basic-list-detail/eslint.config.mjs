import nextExportLoader from 'next-export-loader/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Enables next-export-loader's recommended rules (no-use-query): components
// must read loader-prefetched data via useSuspenseQuery, never useQuery.
export default [
  {
    files: ['pages/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  nextExportLoader.configs.recommended,
];
