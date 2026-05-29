import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import plugin, { rules } from './eslint-plugin';

interface Report {
  node: unknown;
  messageId: string;
}

function lintImport(name: string, source: string): Report[] {
  const reports: Report[] = [];
  const rule = rules['no-use-query'];
  assert.ok(rule);
  const visitors = rule.create({
    report: (descriptor) => reports.push(descriptor),
  });
  visitors.ImportSpecifier?.({
    imported: { name },
    parent: { source: { value: source } },
  });
  return reports;
}

describe('eslint-plugin: no-use-query', () => {
  it('reports useQuery imported from @tanstack/react-query', () => {
    const reports = lintImport('useQuery', '@tanstack/react-query');
    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0]?.messageId, 'noUseQuery');
  });

  it('allows useSuspenseQuery', () => {
    assert.strictEqual(
      lintImport('useSuspenseQuery', '@tanstack/react-query').length,
      0,
    );
  });

  it('ignores useQuery imported from another module', () => {
    assert.strictEqual(lintImport('useQuery', './my-hooks').length, 0);
  });
});

describe('eslint-plugin: packaging', () => {
  it('exposes a named plugin via meta', () => {
    assert.strictEqual(plugin.meta.name, 'next-export-loader');
  });

  it('ships a recommended flat config that enables the rule', () => {
    const recommended = plugin.configs.recommended;
    assert.ok(recommended);
    assert.strictEqual(
      recommended.rules['next-export-loader/no-use-query'],
      'error',
    );
    assert.strictEqual(
      recommended.plugins['next-export-loader'],
      plugin,
    );
  });
});
