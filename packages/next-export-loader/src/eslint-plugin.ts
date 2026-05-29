interface RuleModule {
  meta: {
    type: string;
    docs: { description: string };
    messages: Record<string, string>;
    schema: readonly never[];
  };
  create(context: RuleContext): Record<string, (node: ImportSpecifierNode) => void>;
}

interface RuleContext {
  report(descriptor: { node: unknown; messageId: string }): void;
}

interface ImportSpecifierNode {
  imported: { name: string };
  parent: { source: { value: string } };
}

type RuleSeverity = 'off' | 'warn' | 'error';

/** Minimal ESLint flat-config shape this plugin ships in `configs`. */
interface FlatConfig {
  plugins: Record<string, EslintPlugin>;
  rules: Record<string, RuleSeverity>;
}

/** The plugin object consumed by ESLint flat config (`eslint.config.js`). */
interface EslintPlugin {
  meta: { name: string };
  rules: Record<string, RuleModule>;
  configs: Record<string, FlatConfig>;
}

const noUseQuery: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow useQuery in favor of useSuspenseQuery',
    },
    messages: {
      noUseQuery:
        'Use useSuspenseQuery instead of useQuery. Loader guarantees data availability.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportSpecifier(node) {
        if (
          node.imported.name === 'useQuery' &&
          node.parent.source.value === '@tanstack/react-query'
        ) {
          context.report({ node, messageId: 'noUseQuery' });
        }
      },
    };
  },
};

const plugin: EslintPlugin = {
  meta: { name: 'next-export-loader' },
  rules: {
    'no-use-query': noUseQuery,
  },
  configs: {},
};

plugin.configs.recommended = {
  plugins: { 'next-export-loader': plugin },
  rules: {
    'next-export-loader/no-use-query': 'error',
  },
};

export type { EslintPlugin, FlatConfig };
export const rules = plugin.rules;
export default plugin;
