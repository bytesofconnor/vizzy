// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartSeed } from './seed';
import { ComposeBox } from '../app/components/ComposeBox';
import { TellMeMore } from '../app/components/TellMeMore';

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: (props: { href?: string; children?: ReactNode; className?: string }) =>
      React.createElement('a', { href: props.href, className: props.className }, props.children),
  };
});

const tryNext = 'Plot federal funds rate changes per year from 2000 to 2026';

const lesson = {
  notice: 'The monthly line hides the year to year move.',
  teach:
    'A long monthly line makes every wiggle look like news.\n\nThe useful cut is how much the rate changed from one year to the next.',
  question: 'Which year actually moved the rate?',
  tryNext,
};

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

describe('Keep learning', () => {
  let host: HTMLDivElement;
  let root: Root;
  let releaseCompose: Array<(response: Response) => void>;
  let originalFocus: HTMLTextAreaElement['focus'];
  const focusDuringGesture: boolean[] = [];
  let gesture = false;
  const scrolled: unknown[] = [];

  beforeEach(() => {
    releaseCompose = [];
    focusDuringGesture.length = 0;
    scrolled.length = 0;
    gesture = false;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    originalFocus = HTMLTextAreaElement.prototype.focus;
    HTMLTextAreaElement.prototype.focus = function focus(this: HTMLTextAreaElement, ...args: []) {
      focusDuringGesture.push(gesture);
      return originalFocus.apply(this, args);
    };
    HTMLElement.prototype.scrollIntoView = (arg?: ScrollIntoViewOptions) => {
      scrolled.push(arg ?? null);
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/compose')) {
          return new Promise<Response>((resolve) => {
            releaseCompose.push(resolve);
          });
        }
        if (url.includes('/api/insight')) {
          return json({ ok: true, lesson });
        }
        if (url.includes('/api/quota')) {
          return json({ configured: false, canCompose: true, freeLeft: 3, credits: 0 });
        }
        if (url.includes('/api/revisions')) {
          return json({ prompts: [] });
        }
        return json({}, 404);
      })
    );
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    for (const resolve of releaseCompose) {
      resolve(json({ ok: false, error: 'stopped' }));
    }
    await act(async () => {
      root.unmount();
    });
    host.remove();
    HTMLTextAreaElement.prototype.focus = originalFocus;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function render(node: ReactNode) {
    await act(async () => {
      root.render(node);
    });
  }

  async function loadLesson() {
    const deeper = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tell me even more')
    );
    expect(deeper).toBeTruthy();
    await act(async () => {
      deeper!.click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  function keepButton(): HTMLButtonElement {
    const button = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('Keep learning'));
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it('starts the follow-up on a phone without focusing or scrolling the composer', async () => {
    await render(
      createElement(
        'div',
        null,
        createElement(TellMeMore, {
          seed,
          presetInsight: 'The rate drifted, then jumped.',
          onInsight: () => undefined,
        }),
        createElement(ComposeBox, { seed, variant: 'hero', showIdeas: false })
      )
    );
    await loadLesson();
    const field = host.querySelector('#again-prompt');
    expect(field).toBeTruthy();

    gesture = true;
    await act(async () => {
      keepButton().click();
    });
    gesture = false;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const calls = vi.mocked(fetch).mock.calls.filter((call) => String(call[0]).includes('/api/compose'));
    expect(calls).toHaveLength(1);
    const init = calls[0]?.[1];
    const body = JSON.parse(String((init as RequestInit).body)) as { prompt?: string; seed?: unknown };
    expect(body.prompt).toBe(tryNext);
    expect(body.seed).toBeUndefined();
    expect((field as HTMLTextAreaElement).value).toBe(tryNext);
    expect(host.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement).not.toBe(field);
    expect(focusDuringGesture).not.toContain(true);
    expect(scrolled).toEqual([]);
    expect(host.textContent).toContain('Revising');
  });

  it('says when a chart is already underway', async () => {
    await render(
      createElement(
        'div',
        null,
        createElement(TellMeMore, {
          seed,
          presetInsight: 'The rate drifted, then jumped.',
          onInsight: () => undefined,
        }),
        createElement(ComposeBox, { seed, variant: 'hero', showIdeas: false })
      )
    );
    await loadLesson();
    await act(async () => {
      keepButton().click();
    });
    await act(async () => {
      keepButton().click();
    });
    expect(host.querySelector('[role="status"]')?.textContent).toMatch(/still making a chart/i);
    const calls = vi.mocked(fetch).mock.calls.filter((call) => String(call[0]).includes('/api/compose'));
    expect(calls).toHaveLength(1);
  });

  it('does not throw when the page has no composer', async () => {
    await render(
      createElement(TellMeMore, {
        seed,
        presetInsight: 'The rate drifted, then jumped.',
        onInsight: () => undefined,
      })
    );
    await loadLesson();
    await act(async () => {
      keepButton().click();
    });
    expect(host.querySelector('[role="status"]')?.textContent).toMatch(/no composer/i);
  });

  it('shows Keep learning as soon as the chart is on screen while insight is still pending', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));
    vi.useFakeTimers();
    try {
      await render(
        createElement(TellMeMore, {
          seed,
          onInsight: () => undefined,
        })
      );
      expect(host.textContent).not.toContain('Reading the chart');
      expect(keepButton().textContent).toContain('Keep learning');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(host.textContent).not.toContain('Reading the chart');
      expect(keepButton().textContent).toContain('Keep learning');
    } finally {
      vi.useRealTimers();
    }
  });

  it('presses in while the button is held', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toMatch(/\.tell-more-next:active\s*\{[^}]*translateY\(1px\)/s);
  });
});
