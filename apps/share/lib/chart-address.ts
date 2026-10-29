export function chartPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://vizzy.run');
  } catch {
    return null;
  }
  if (!parsed.pathname.startsWith('/c/')) {
    return null;
  }
  return `${parsed.pathname}${parsed.search}`;
}

export function pointAddressAtChart(url: string): void {
  const path = chartPath(url);
  if (!path || typeof window === 'undefined') {
    return;
  }
  const here = `${window.location.pathname}${window.location.search}`;
  if (here === path) {
    return;
  }
  window.history.replaceState(window.history.state, '', path);
}
