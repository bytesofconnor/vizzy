import { describe, expect, it } from 'vitest';
import { chartTitleFromAsk, looksLikeInstruction, remixFollowUp, remixPrompt, titleForChart } from './remix-prompt';

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

describe('titleForChart', () => {
  it('does not name the figure after a revise command', () => {
    const asked = 'Add the missing comparison that would change how Tanzania looks';
    expect(looksLikeInstruction(asked)).toBe(true);
    expect(chartTitleFromAsk(asked)).toBe('A remix');
    expect(
      titleForChart({
        drafted: asked,
        asked,
        previous: 'Share of territorial waters that are marine protected areas',
      })
    ).toBe('Share of territorial waters that are marine protected areas');
  });

  it('keeps a real drafted title when the subject changed', () => {
    expect(
      titleForChart({
        drafted: 'Wild tiger population by country',
        asked: 'Switch this to tigers',
        previous: 'Share of territorial waters that are marine protected areas',
      })
    ).toBe('Wild tiger population by country');
  });
});
