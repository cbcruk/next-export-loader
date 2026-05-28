let authenticated = false;

export function isAuthenticated(): boolean {
  return authenticated;
}

export function login(): void {
  authenticated = true;
}

export function logout(): void {
  authenticated = false;
}
