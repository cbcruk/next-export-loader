import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseUrl } from './parse-url';

describe('parseUrl', () => {
  it('returns empty object for URL without search params', () => {
    assert.deepStrictEqual(parseUrl('/items'), {});
  });

  it('returns empty object for empty string', () => {
    assert.deepStrictEqual(parseUrl(''), {});
  });

  it('parses single param', () => {
    assert.deepStrictEqual(parseUrl('/items?id=1'), { id: '1' });
  });

  it('parses multiple params', () => {
    assert.deepStrictEqual(parseUrl('/search?q=hello&page=2'), {
      q: 'hello',
      page: '2',
    });
  });

  it('parses repeated param as array', () => {
    assert.deepStrictEqual(parseUrl('/filter?tag=a&tag=b&tag=c'), {
      tag: ['a', 'b', 'c'],
    });
  });

  it('handles URL with hash', () => {
    assert.deepStrictEqual(parseUrl('/items?id=1#section'), { id: '1' });
  });

  it('handles empty param value', () => {
    assert.deepStrictEqual(parseUrl('/items?id='), { id: '' });
  });

  it('decodes encoded characters', () => {
    assert.deepStrictEqual(parseUrl('/search?q=hello%20world'), {
      q: 'hello world',
    });
  });
});
