import { gateOnce, type FunnelAuth, type FunnelEvent, type FunnelProps } from '../../../convex/funnel';

const VISIT_KEY = 'vizzy.funnel.visit';
const FIRST_PREFIX = 'vizzy.funnel.first.';
const UPGRADE_KEY = 'vizzy.funnel.upgrade';

export function track(event: FunnelEvent, props?: FunnelProps): void {
  const body = props?.auth ? { event, props: { auth: props.auth } } : { event };
  try {
    void fetch('/api/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // A missed count must not break the page.
  }
}

function once(storage: Storage, key: string): boolean {
  try {
    return gateOnce(
      () => storage.getItem(key),
      (value) => storage.setItem(key, value)
    );
  } catch {
    return false;
  }
}

export function trackVisit(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  if (!once(sessionStorage, VISIT_KEY)) {
    return;
  }
  track('visit');
}

export function trackFirstChart(auth: FunnelAuth): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (!once(localStorage, `${FIRST_PREFIX}${auth}`)) {
    return;
  }
  track('first_chart', { auth });
}

export function trackUpgradeView(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  if (!once(sessionStorage, UPGRADE_KEY)) {
    return;
  }
  track('upgrade_view');
}
