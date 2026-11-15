import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const { written } = vi.hoisted(() => ({ written: [] as string[] }));

vi.mock('./telemetry', () => ({
  bumpEvent: vi.fn(async (name: string) => {
    written.push(name);
  }),
}));

import { POST } from '../app/api/funnel/route';
import {
  aggregateFunnel,
  counterName,
  gateOnce,
  parseTrackBody,
  utcDay,
  weekBounds,
} from '../../../convex/funnel';
import { track } from './track';

const NOW = Date.parse('2026-11-15T04:41:00.000Z');

afterEach(() => {
  written.length = 0;
});

describe('track', () => {
  it('writes the counter name and drops anything that is not the auth split', async () => {
    const names: string[] = [];
    const saved = await track('first_chart', { auth: 'signed_out' }, (name) => {
      names.push(name);
      return undefined;
    });
    expect(saved).toBe(true);
    expect(names).toEqual(['first_chart_signed_out']);
    expect(counterName('visit', { auth: 'signed_in' })).toBe('visit');
    expect(counterName('first_chart')).toBeNull();
    expect(
      await track('first_chart', undefined, (name) => {
        names.push(name);
      })
    ).toBe(false);
    expect(names).toEqual(['first_chart_signed_out']);
  });

  it('rejects a body that carries an email or an unknown event', () => {
    const parsed = parseTrackBody({
      event: 'first_chart',
      props: { auth: 'signed_in', email: 'person@example.com' },
    });
    expect(parsed).toEqual({ event: 'first_chart', props: { auth: 'signed_in' } });
    expect(JSON.stringify(parsed)).not.toContain('person@example.com');
    expect(parseTrackBody({ event: 'first_chart' })).toBeNull();
    expect(parseTrackBody({ event: 'tap_terms' })).toBeNull();
    expect(parseTrackBody({ event: 'gallery_view' })).toEqual({ event: 'gallery_view' });
    expect(parseTrackBody({ event: 'remix_click' })).toEqual({ event: 'remix_click' });
    expect(parseTrackBody({ event: 'signup', props: { email: 'person@example.com' } })).toEqual({
      event: 'signup',
    });
  });

  it('counts a visit once per session gate and a first chart once per auth', () => {
    const store = new Map<string, string>();
    const read = (key: string) => store.get(key) ?? null;
    const write = (key: string, value: string) => {
      store.set(key, value);
    };
    expect(gateOnce(() => read('visit'), (value) => write('visit', value))).toBe(true);
    expect(gateOnce(() => read('visit'), (value) => write('visit', value))).toBe(false);
    expect(gateOnce(() => read('first.signed_out'), (value) => write('first.signed_out', value))).toBe(true);
    expect(gateOnce(() => read('first.signed_in'), (value) => write('first.signed_in', value))).toBe(true);
    expect(store.size).toBe(3);
  });
});

describe('weekly funnel aggregation', () => {
  it('sums the trailing seven UTC days and rates each step against the one above', () => {
    const { fromDay, toDay } = weekBounds(NOW);
    expect(fromDay).toBe('2026-11-09');
    expect(toDay).toBe('2026-11-15');
    const readout = aggregateFunnel(
      [
        { name: 'visit', day: '2026-11-08', count: 9 },
        { name: 'visit', day: '2026-11-09', count: 2 },
        { name: 'visit', day: '2026-11-15', count: 2 },
        { name: 'first_chart_signed_out', day: '2026-11-15', count: 1 },
        { name: 'first_chart_signed_in', day: '2026-11-10', count: 1 },
        { name: 'signup', day: '2026-11-15', count: 1 },
        { name: 'paid', day: '2026-11-15', count: 0 },
        { name: 'library_save', day: '2026-11-15', count: 4 },
      ],
      NOW
    );
    const byEvent = new Map(readout.steps.map((step) => [step.event, step]));
    expect(byEvent.get('visit')).toMatchObject({ count: 4, rateFromPrevious: null, rateFromVisit: null });
    expect(byEvent.get('first_chart')).toMatchObject({
      count: 2,
      signedOut: 1,
      signedIn: 1,
      rateFromPrevious: 0.5,
      rateFromVisit: 0.5,
    });
    expect(byEvent.get('signup')).toMatchObject({
      count: 1,
      rateFromPrevious: 0.5,
      rateFromVisit: 0.25,
    });
    expect(byEvent.get('library_save')?.count).toBe(4);
    expect(byEvent.get('library_save')?.rateFromPrevious).toBe(4);
    expect(byEvent.get('share_created')).toMatchObject({ count: 0, rateFromPrevious: 0 });
    expect(byEvent.get('paid')?.count).toBe(0);
    const withGallery = aggregateFunnel(
      [
        { name: 'visit', day: '2026-11-15', count: 1 },
        { name: 'gallery_view', day: '2026-11-15', count: 5 },
        { name: 'remix_click', day: '2026-11-15', count: 2 },
      ],
      NOW
    );
    expect(withGallery.steps.map((step) => step.event)).not.toContain('gallery_view');
    expect(withGallery.steps[0]?.count).toBe(1);
  });

  it('leaves the rate blank when the previous step is zero', () => {
    const readout = aggregateFunnel([{ name: 'paid', day: utcDay(NOW), count: 2 }], NOW);
    const paid = readout.steps.find((step) => step.event === 'paid');
    const checkout = readout.steps.find((step) => step.event === 'checkout_started');
    expect(checkout?.count).toBe(0);
    expect(paid).toMatchObject({ count: 2, rateFromPrevious: null, rateFromVisit: null });
  });
});

describe('visit, first chart, then signup', () => {
  it('records those events and the readout shows a count for each', async () => {
    const visit = await POST(json({ event: 'visit' }));
    const chart = await POST(json({ event: 'first_chart', props: { auth: 'signed_out', email: 'nope@example.com' } }));
    const signup = await POST(json({ event: 'signup' }));
    expect(visit.status).toBe(200);
    expect(chart.status).toBe(200);
    expect(signup.status).toBe(200);
    expect(written).toEqual(['visit', 'first_chart_signed_out', 'signup']);
    expect(written.join(' ')).not.toContain('example.com');

    const day = utcDay(NOW);
    const readout = aggregateFunnel(
      written.map((name) => ({ name, day, count: 1 })),
      NOW
    );
    const counts = Object.fromEntries(readout.steps.map((step) => [step.event, step.count]));
    expect(counts.visit).toBe(1);
    expect(counts.first_chart).toBe(1);
    expect(counts.signup).toBe(1);
    expect(readout.steps.find((step) => step.event === 'first_chart')?.signedOut).toBe(1);
    expect(readout.steps.find((step) => step.event === 'signup')?.rateFromPrevious).toBe(1);
    const lines = readout.steps.map((step) => `${step.event} ${step.count}`).join('\n');
    expect(lines).toContain('visit 1');
    expect(lines).toContain('first_chart 1');
    expect(lines).toContain('signup 1');
  });
});

function json(body: unknown): Request {
  return new Request('https://vizzy.test/api/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
