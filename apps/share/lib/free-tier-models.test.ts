import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STACK_MODELS } from './ai-models';

const BANNED = [
  'groq/llama-3.3-70b-versatile',
  'xai/grok-3-mini',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-4o-mini',
] as const;

type Snapshot = { source: string; retrieved: string; ids: string[] };

describe('configured model ids', () => {
  const snapshot = JSON.parse(
    readFileSync(new URL('./gateway-models.snapshot.json', import.meta.url), 'utf8')
  ) as Snapshot;
  const listed = new Set(snapshot.ids);

  it('uses only ids from the pinned AI Gateway catalog', () => {
    expect(snapshot.source).toBe('https://ai-gateway.vercel.sh/v1/models');
    expect(snapshot.retrieved).toBe('2026-11-18');
    expect(STACK_MODELS.length).toBeGreaterThan(0);
    for (const id of STACK_MODELS) {
      expect(listed.has(id), id).toBe(true);
    }
  });

  it('leaves out models the gateway dropped or the free tier blocks', () => {
    for (const id of BANNED) {
      expect(STACK_MODELS).not.toContain(id);
    }
    expect(STACK_MODELS).toEqual(
      expect.arrayContaining([
        'google/gemini-2.5-flash',
        'google/gemini-2.5-flash-lite',
        'openai/gpt-4.1-mini',
        'perplexity/sonar',
      ])
    );
  });
});
