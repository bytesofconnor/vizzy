import { generateText } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decideCompose } from './compose-decision';
import { pieceFromPrompt } from './from-prompt';

vi.mock('ai', () => ({
  generateText: vi.fn(() => {
    throw new Error('draft model ran');
  }),
  Output: { object: () => ({ schema: {} }) },
  tool: () => ({}),
  isStepCount: () => () => false,
}));

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.mocked(generateText).mockClear();
});

function stateCsv(url: string): string {
  const ids = decodeURIComponent(new URL(url).searchParams.get('id') ?? '').split(',');
  const header = ['observation_date', ...ids].join(',');
  const latest = ['2026-09-01', ...ids.map((_, index) => String(index + 1))].join(',');
  return `${header}\n${latest}`;
}

function installFetch() {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('id=GDPCA')) {
      return new Response(
        ['observation_date,GDPCA', '1999-01-01,100', '2000-01-01,110.2', '2024-01-01,230.5'].join('\n')
      );
    }
    if (url.includes('fredgraph.csv')) {
      return new Response(stateCsv(url));
    }
    return new Response('missing', { status: 404 });
  }) as typeof fetch;
  return calls;
}

async function mint(prompt: string) {
  const decision = decideCompose({ prompt, disposition: 'send' });
  expect(decision.kind).toBe('mint');
  if (decision.kind !== 'mint') {
    throw new Error('expected a mint');
  }
  return pieceFromPrompt(decision);
}

describe('slow prompts skip the model chain', () => {
  it('mints US GDP since 2000 from one FRED fetch', async () => {
    const calls = installFetch();
    const minted = await mint('US GDP since 2000');
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(calls).toHaveLength(1);
    expect(vi.mocked(generateText)).not.toHaveBeenCalled();
    expect(minted.piece.data.map((row) => String(row.x))).toEqual(['2000', '2024']);
    expect(minted.piece.data.map((row) => row.y)).toEqual([110.2, 230.5]);
    expect(minted.piece.config.chart.type).toBe('line');
    expect(minted.piece.note).toContain('2000');
    expect(minted.piece.note).toContain('2024');
  });

  it('mints unemployment for all 50 states from one FRED fetch', async () => {
    const calls = installFetch();
    const minted = await mint('unemployment rate by US state');
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(calls).toHaveLength(5);
    expect(vi.mocked(generateText)).not.toHaveBeenCalled();
    const names = minted.piece.data.map((row) => String(row.x));
    expect(names).toHaveLength(50);
    expect(names).toEqual(expect.arrayContaining(['California', 'Indiana', 'New Jersey', 'Wyoming']));
    expect(minted.piece.config.chart.type).toBe('bar');
    expect(minted.piece.note).not.toMatch(/\b15 states\b/);
  });
});
