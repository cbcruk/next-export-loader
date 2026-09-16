import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { describeEmpty, formatDuration, formatStatus } from './panel.utils';

describe('panel utils', () => {
  it('formatDuration shows an ellipsis while loading', () => {
    assert.equal(formatDuration(null), '…');
    assert.equal(formatDuration(120), '120ms');
  });

  it('formatStatus pluralizes and reports connection problems', () => {
    assert.equal(formatStatus('connected', 1), '1 navigation');
    assert.equal(formatStatus('connected', 3), '3 navigations');
    assert.equal(formatStatus('connecting', 3), 'connecting…');
    assert.equal(formatStatus('missing', 0), 'page script not found');
  });

  it('describeEmpty points at the page script when it is missing', () => {
    assert.match(describeEmpty('missing'), /mountLoaderPageScript/);
  });
});
