/** Options controlling how a {@link RedirectError} navigates. */
export interface RedirectOptions {
  /**
   * Replace the current history entry instead of pushing a new one.
   * @defaultValue `true`
   */
  replace?: boolean;
}

/**
 * Thrown from a loader to redirect before the page component mounts.
 *
 * `<LoaderRuntime>` catches it, navigates to `destination`, and restarts the
 * loader lifecycle at the new URL — the original page never mounts. Use this
 * for auth gates and canonical-URL rewrites that must run pre-mount.
 *
 * @example
 * ```ts
 * Page.loader = defineLoader(async ({ queryClient }) => {
 *   const user = await queryClient.ensureQueryData(userQuery());
 *   if (!user) throw new RedirectError('/login');
 * });
 * ```
 */
export class RedirectError extends Error {
  /** URL to navigate to. */
  readonly destination: string;
  /** Whether the navigation replaces the current history entry. */
  readonly replace: boolean;

  constructor(destination: string, options?: RedirectOptions) {
    super(`Redirect to ${destination}`);
    this.name = 'RedirectError';
    this.destination = destination;
    this.replace = options?.replace ?? true;
  }
}

/**
 * Type guard for {@link RedirectError}, narrowing an `unknown` caught value.
 *
 * @param error - The caught value to test.
 * @returns `true` if `error` is a {@link RedirectError}.
 */
export function isRedirectError(error: unknown): error is RedirectError {
  return error instanceof RedirectError;
}
