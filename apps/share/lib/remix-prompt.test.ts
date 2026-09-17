import { describe, expect, it } from 'vitest';
import { remixFollowUp, remixPrompt } from './remix-prompt';

describe('remixPrompt', () => {
  it('cites the paste URL and leaves room for the next question', () => {
    const text = remixPrompt(
      {
        slug: 'reef',
        title: 'Great Barrier Reef hard coral cover by sector',
        note: 'AIMS monitoring.',
        config: {
          schemaVersion: 1,
          chart: { type: 'line' },
          dataMapping: { x: 'year', y: 'cover' },
          source: {
            label: 'AIMS Long-Term Monitoring',
            method: 'official',
            url: 'https://www.aims.gov.au/',
          },
        },
      },
      'https://vizzy.run'
    );
    expect(text).toContain('https://vizzy.run/c/reef');
    expect(text).toContain('(official)');
    expect(text.endsWith('The next cut I want:')).toBe(true);
    expect(text).not.toMatch(/confidence/i);
  });

  it('reads the follow-up after the remix scaffold', () => {
    expect(remixFollowUp('Start from this chart and ask a sharper public question.\n\nThe next cut I want:\nWhy the 2022 spike?')).toBe(
      'Why the 2022 spike?'
    );
    expect(remixFollowUp('Start from this chart and ask a sharper public question. Keep published numbers. Do not invent a source.')).toBe(
      ''
    );
  });
});
