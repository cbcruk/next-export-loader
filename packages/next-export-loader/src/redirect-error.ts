export interface RedirectOptions {
  replace?: boolean;
}

export class RedirectError extends Error {
  readonly destination: string;
  readonly replace: boolean;

  constructor(destination: string, options?: RedirectOptions) {
    super(`Redirect to ${destination}`);
    this.name = 'RedirectError';
    this.destination = destination;
    this.replace = options?.replace ?? true;
  }
}

export function isRedirectError(error: unknown): error is RedirectError {
  return error instanceof RedirectError;
}
