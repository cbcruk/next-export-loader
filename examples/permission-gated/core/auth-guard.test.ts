import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthGuard, type Session } from './auth-guard';
import { ROLE_PERMISSIONS, type User } from './permissions';

function userWith(role: 'viewer' | 'editor' | 'admin'): User {
  return {
    id: `u-${role}`,
    name: role,
    role,
    permissions: ROLE_PERMISSIONS[role],
  };
}

const authed = (role: 'viewer' | 'editor' | 'admin'): Session => ({
  status: 'authenticated',
  user: userWith(role),
});

describe('checkAuthGuard', () => {
  it('returns pending while the session is loading', () => {
    const result = checkAuthGuard({
      session: { status: 'loading' },
      currentPath: '/posts',
    });
    assert.deepStrictEqual(result, { type: 'pending' });
  });

  it('redirects unauthenticated users to login, preserving the path', () => {
    const result = checkAuthGuard({
      session: { status: 'unauthenticated' },
      currentPath: '/admin/users',
    });
    assert.deepStrictEqual(result, {
      type: 'redirect',
      to: '/login',
      search: { redirect: '/admin/users' },
    });
  });

  it('allows an authenticated user when no permissions are required', () => {
    const result = checkAuthGuard({
      session: authed('viewer'),
      currentPath: '/',
    });
    assert.deepStrictEqual(result, { type: 'allow' });
  });

  it('allows when the user has every required permission', () => {
    const result = checkAuthGuard({
      session: authed('admin'),
      requiredPermissions: ['users:read', 'users:manage'],
      currentPath: '/admin/users',
    });
    assert.deepStrictEqual(result, { type: 'allow' });
  });

  it('redirects to unauthorized when a permission is missing', () => {
    const result = checkAuthGuard({
      session: authed('viewer'),
      requiredPermissions: ['users:manage'],
      currentPath: '/admin/users',
    });
    assert.deepStrictEqual(result, { type: 'redirect', to: '/unauthorized' });
  });

  it('editor lacks billing:manage', () => {
    const result = checkAuthGuard({
      session: authed('editor'),
      requiredPermissions: ['billing:manage'],
      currentPath: '/admin/billing',
    });
    assert.deepStrictEqual(result, { type: 'redirect', to: '/unauthorized' });
  });

  it('honors custom login/unauthorized/redirect-param overrides', () => {
    const result = checkAuthGuard({
      session: { status: 'unauthenticated' },
      currentPath: '/x',
      loginPath: '/signin',
      redirectParam: 'next',
    });
    assert.deepStrictEqual(result, {
      type: 'redirect',
      to: '/signin',
      search: { next: '/x' },
    });
  });
});
