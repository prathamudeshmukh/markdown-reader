const storageKey = (slug: string) => `mreader:creator-token:${slug}`;

export function saveCreatorToken(slug: string, token: string): void {
  localStorage.setItem(storageKey(slug), token);
}

export function loadCreatorToken(slug: string): string | null {
  return localStorage.getItem(storageKey(slug));
}

export function clearCreatorToken(slug: string): void {
  localStorage.removeItem(storageKey(slug));
}
