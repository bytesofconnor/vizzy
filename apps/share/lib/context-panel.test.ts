// @vitest-environment jsdom

import { createElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TellMeMore } from '../app/components/TellMeMore';
import type { ChartSeed } from './seed';

const seed: ChartSeed = {
  title: 'Federal funds rate',
  kicker: 'FRED',
  note: 'Monthly effective rate',
  chartType: 'line',
  area: false,
  xLabel: 'Month',
  yLabel: 'Rate %',
  sourceLabel: 'FRED',
  sourceMethod: 'official',
  evidence: 'Published series',
  rows: [
    { x: '2000-01', y: 5.5 },
    { x: '2000-12', y: 6.5 },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('context panel after a chart renders', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    host.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function render() {
    await act(async () => {
      root.render(createElement(TellMeMore, { seed, onInsight: () => undefined }));
    });
  }

  it('shows Keep learning while the insight request is still pending', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    await render();
    expect(host.textContent).not.toContain('Reading the chart');
    expect(host.textContent).toContain('Keep learning');
    expect(host.textContent).toContain('2000-12');
  });

  it('replaces the opening copy when the model insight arrives', async () => {
    const model =
      'The monthly rate rose into December and that rise is the point.\n\nFRED published the series, so the endpoints are the prints to trust.';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ ok: true, insight: model }))
    );
    await render();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.textContent).toContain('rose into December');
    expect(host.textContent).toContain('Keep learning');
    expect(host.textContent).not.toContain('Reading the chart');
  });
});
