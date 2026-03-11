export function readHash(): string | null {
  const hash = window.location.hash.slice(1);
  return hash.length > 0 ? hash : null;
}

export function writeHash(encoded: string): void {
  const url =
    encoded.length > 0
      ? `${window.location.pathname}${window.location.search}#${encoded}`
      : window.location.pathname + window.location.search;
  history.replaceState(null, '', url);
}
