import { matchPrompt } from '@vizzy/resolve';
import { describe, expect, it } from 'vitest';
import { FAST_EXAMPLES } from './fast-examples';

describe('fast examples', () => {
  it('matches each homepage prompt to one catalog series', () => {
    expect(FAST_EXAMPLES.length).toBeGreaterThanOrEqual(4);
    expect(FAST_EXAMPLES.length).toBeLessThanOrEqual(6);
    for (const example of FAST_EXAMPLES) {
      expect(matchPrompt(example.prompt)?.seriesId, example.prompt).toBe(example.seriesId);
    }
  });
});
