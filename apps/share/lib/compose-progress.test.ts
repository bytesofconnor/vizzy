import { describe, expect, it } from 'vitest';
import { guessBarCount, lookupDetail, sourceHintFromUrls } from './compose-progress';

describe('compose-progress', () => {
  it('guesses bar count from top-N prompts', () => {
    expect(guessBarCount('top 5 countries by GDP')).toBe(5);
    expect(guessBarCount('life expectancy by country')).toBe(12);
  });

  it('formats lookup detail from urls', () => {
    expect(sourceHintFromUrls(['https://www.who.int/data/foo'])).toBe('who.int');
    expect(
      lookupDetail(
        { notes: 'x'.repeat(100), urls: ['https://data.worldbank.org/x'] },
        false
      )
    ).toBe('Found data on data.worldbank.org');
    expect(lookupDetail({ notes: '', urls: [] }, false)).toBe('No published table — estimating shape');
    expect(lookupDetail({ notes: 'row', urls: [] }, true)).toBe('Using numbers from your prompt');
  });
});
