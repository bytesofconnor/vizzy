import { describe, expect, it } from 'vitest';
import { composeAsk } from './compose-ask';

const hero = 'Bitcoin price from March to June 2021';
const revise = 'Make it a line chart.';

describe('composeAsk', () => {
  it('does not generate a demo when new chart has an empty revise box', () => {
    expect(
      composeAsk({
        typed: '',
        freshClick: true,
        studio: true,
        heroExample: hero,
        reviseExample: revise,
      })
    ).toBeNull();
  });

  it('generates a new chart from typed text and leaves the composer empty', () => {
    expect(
      composeAsk({
        typed: 'Solar capacity added by country in 2023',
        freshClick: true,
        studio: true,
        heroExample: hero,
        reviseExample: revise,
      })
    ).toEqual({
      prompt: 'Solar capacity added by country in 2023',
      fresh: true,
      fillComposer: false,
    });
  });

  it('does not keep the previous subject when revise names a new topic', () => {
    expect(
      composeAsk({
        typed: 'US unemployment since 2019',
        freshClick: false,
        studio: true,
        heroExample: hero,
        reviseExample: revise,
      })
    ).toEqual({
      prompt: 'US unemployment since 2019',
      fresh: true,
      fillComposer: false,
    });
  });

  it('keeps the chart when revise is a command', () => {
    expect(
      composeAsk({
        typed: 'Make it a line chart.',
        freshClick: false,
        studio: true,
        heroExample: hero,
        reviseExample: revise,
      })
    ).toEqual({
      prompt: 'Make it a line chart.',
      fresh: false,
      fillComposer: false,
    });
  });

  it('uses the revise demo only for an empty revise click', () => {
    expect(
      composeAsk({
        typed: '  ',
        freshClick: false,
        studio: true,
        heroExample: hero,
        reviseExample: revise,
      })
    ).toEqual({ prompt: revise, fresh: false, fillComposer: true });
  });

  it('still offers the homepage demo when generate is clicked with an empty field', () => {
    expect(
      composeAsk({
        typed: '',
        freshClick: false,
        studio: false,
        heroExample: hero,
        reviseExample: revise,
      })
    ).toEqual({ prompt: hero, fresh: false, fillComposer: true });
  });
});
