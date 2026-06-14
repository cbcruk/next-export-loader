/**
 * Permission catalog. Permission-based (not role-based) so a route can require a
 * precise capability rather than a coarse role. A role is just a named bundle of
 * permissions (see ROLE_PERMISSIONS), which keeps guards declarative.
 */
export type Permission =
  | 'posts:read'
  | 'posts:write'
  | 'users:read'
  | 'users:manage'
  | 'billing:manage';

export type Role = 'viewer' | 'editor' | 'admin';

export const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  viewer: ['posts:read', 'users:read'],
  editor: ['posts:read', 'posts:write', 'users:read'],
  admin: [
    'posts:read',
    'posts:write',
    'users:read',
    'users:manage',
    'billing:manage',
  ],
};

export interface User {
  id: string;
  name: string;
  role: Role;
  permissions: ReadonlyArray<Permission>;
}

export function hasPermissions(
  user: User,
  required: ReadonlyArray<Permission>,
): boolean {
  return required.every((p) => user.permissions.includes(p));
}

export function missingPermissions(
  user: User,
  required: ReadonlyArray<Permission>,
): Permission[] {
  return required.filter((p) => !user.permissions.includes(p));
}
