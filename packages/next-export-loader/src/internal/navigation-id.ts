let currentId = 0;

export function createNavigationId(): number {
  currentId += 1;
  return currentId;
}

export function isLatestNavigation(id: number): boolean {
  return id === currentId;
}
