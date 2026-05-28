import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RedirectError, isRedirectError } from './redirect-error';

describe('RedirectError', () => {
  it('sets destination', () => {
    const err = new RedirectError('/login');
    assert.strictEqual(err.destination, '/login');
  });

  it('defaults replace to true', () => {
    const err = new RedirectError('/login');
    assert.strictEqual(err.replace, true);
  });

  it('respects replace: false option', () => {
    const err = new RedirectError('/login', { replace: false });
    assert.strictEqual(err.replace, false);
  });

  it('has name "RedirectError"', () => {
    const err = new RedirectError('/login');
    assert.strictEqual(err.name, 'RedirectError');
  });

  it('is an instance of Error', () => {
    const err = new RedirectError('/login');
    assert.ok(err instanceof Error);
  });

  it('includes destination in message', () => {
    const err = new RedirectError('/dashboard');
    assert.ok(err.message.includes('/dashboard'));
  });
});

describe('isRedirectError', () => {
  it('returns true for RedirectError', () => {
    assert.strictEqual(isRedirectError(new RedirectError('/login')), true);
  });

  it('returns false for regular Error', () => {
    assert.strictEqual(isRedirectError(new Error('fail')), false);
  });

  it('returns false for null', () => {
    assert.strictEqual(isRedirectError(null), false);
  });

  it('returns false for undefined', () => {
    assert.strictEqual(isRedirectError(undefined), false);
  });

  it('returns false for plain object', () => {
    assert.strictEqual(
      isRedirectError({ destination: '/login', name: 'RedirectError' }),
      false,
    );
  });
});
