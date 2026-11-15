export const FUNNEL_EVENTS = [
  'visit',
  'first_chart',
  'signup',
  'library_save',
  'share_created',
  'shared_view',
  'shared_compose',
  'free_limit',
  'upgrade_view',
  'checkout_started',
  'paid',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export type FunnelAuth = 'signed_in' | 'signed_out';

export type FunnelProps = {
  auth?: FunnelAuth;
};

export const FUNNEL_LABELS: Record<FunnelEvent, string> = {
  visit: 'Visit',
  first_chart: 'First chart',
  signup: 'Signup',
  library_save: 'Save to Library',
  share_created: 'Share or embed',
  shared_view: 'Shared chart view',
  shared_compose: 'Open composer from a shared chart',
  free_limit: 'Free limit hit',
  upgrade_view: 'Upgrade view',
  checkout_started: 'Checkout started',
  paid: 'Paid',
};

const AUTH = new Set<FunnelAuth>(['signed_in', 'signed_out']);

export function isFunnelEvent(value: string): value is FunnelEvent {
  return (FUNNEL_EVENTS as readonly string[]).includes(value);
}

export function readAuth(props: unknown): FunnelAuth | undefined {
  if (typeof props !== 'object' || props === null || !('auth' in props)) {
    return undefined;
  }
  const auth = (props as { auth: unknown }).auth;
  if (auth === 'signed_in' || auth === 'signed_out') {
    return auth;
  }
  return undefined;
}

export function counterName(event: FunnelEvent, props?: FunnelProps): string | null {
  if (event === 'first_chart') {
    if (!props?.auth || !AUTH.has(props.auth)) {
      return null;
    }
    return props.auth === 'signed_in' ? 'first_chart_signed_in' : 'first_chart_signed_out';
  }
  return event;
}

export function parseTrackBody(body: unknown): { event: FunnelEvent; props?: FunnelProps } | null {
  if (typeof body !== 'object' || body === null || !('event' in body)) {
    return null;
  }
  const event = (body as { event: unknown }).event;
  if (typeof event !== 'string' || !isFunnelEvent(event)) {
    return null;
  }
  const auth = 'props' in body ? readAuth((body as { props: unknown }).props) : undefined;
  if (event === 'first_chart') {
    if (!auth) {
      return null;
    }
    return { event, props: { auth } };
  }
  return { event };
}

export type DailyCount = {
  name: string;
  day: string;
  count: number;
};

export type FunnelStep = {
  event: FunnelEvent;
  label: string;
  count: number;
  rateFromPrevious: number | null;
  rateFromVisit: number | null;
  signedOut?: number;
  signedIn?: number;
};

export type FunnelReadout = {
  fromDay: string;
  toDay: string;
  steps: FunnelStep[];
};

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function weekBounds(now: number): { fromDay: string; toDay: string } {
  const toDay = utcDay(now);
  const end = Date.parse(`${toDay}T00:00:00.000Z`);
  const fromDay = utcDay(end - 6 * 24 * 60 * 60 * 1000);
  return { fromDay, toDay };
}

export function aggregateFunnel(rows: DailyCount[], now: number): FunnelReadout {
  const { fromDay, toDay } = weekBounds(now);
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.day < fromDay || row.day > toDay) {
      continue;
    }
    if (!Number.isFinite(row.count) || row.count <= 0) {
      continue;
    }
    totals.set(row.name, (totals.get(row.name) ?? 0) + row.count);
  }

  const steps: FunnelStep[] = FUNNEL_EVENTS.map((event) => {
    if (event === 'first_chart') {
      const signedOut = totals.get('first_chart_signed_out') ?? 0;
      const signedIn = totals.get('first_chart_signed_in') ?? 0;
      return {
        event,
        label: FUNNEL_LABELS[event],
        count: signedOut + signedIn,
        rateFromPrevious: null,
        rateFromVisit: null,
        signedOut,
        signedIn,
      };
    }
    return {
      event,
      label: FUNNEL_LABELS[event],
      count: totals.get(event) ?? 0,
      rateFromPrevious: null,
      rateFromVisit: null,
    };
  });

  const visit = steps[0]?.count ?? 0;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step || index === 0) {
      continue;
    }
    const previous = steps[index - 1]?.count ?? 0;
    step.rateFromPrevious = previous > 0 ? step.count / previous : null;
    step.rateFromVisit = visit > 0 ? step.count / visit : null;
  }

  return { fromDay, toDay, steps };
}

export function gateOnce(read: () => string | null, write: (value: string) => void): boolean {
  if (read()) {
    return false;
  }
  write('1');
  return true;
}
