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

export const rules = {
  'no-use-query': noUseQuery,
} as const;
