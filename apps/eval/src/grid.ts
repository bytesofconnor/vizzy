import type { DataSituation, Domain, EvalPrompt, PromptStyle } from './types';
import { DATA_SITUATIONS, PROMPT_STYLES } from './types';

const DOMAIN_ROTATION: Domain[] = ['climate', 'macro', 'sports', 'messy'];

/** One prompt per style × situation. 24 cells. */
const PROMPT_TEXT: Record<PromptStyle, Record<DataSituation, string>> = {
  short: {
    lookup_hit: 'ozone hole working??',
    lookup_miss: 'wild tigers left??',
    in_progress: 'this year’s jobs numbers',
    pasted_numbers: 'chart this: 12, 15, 14, 18',
  },
  time: {
    lookup_hit: 'Antarctic ozone hole peak area by year since 1980 as a line',
    lookup_miss: 'Monthly sightings of a made-up river monster since 2010',
    in_progress: 'US monthly unemployment rate this year so far',
    pasted_numbers: 'Revenue by month from this table: Jan 12 Feb 15 Mar 14 Apr 18',
  },
  ranking: {
    lookup_hit: 'Deadliest volcanic eruptions since 1800 by lives lost',
    lookup_miss: 'Best fictional swords in novels ranked by made-up power',
    in_progress: 'AL East wins this season so far, not the full 162',
    pasted_numbers: 'Rank these shops by this count: North 12 Central 15 South 14 East 18',
  },
  compare: {
    lookup_hit: 'US rent vs wages since 2010 — one comparable index',
    lookup_miss: 'Dragons vs unicorns population since 2010',
    in_progress: 'This year’s home runs vs strikeouts for one team, published games only',
    pasted_numbers: 'Compare A and B using only: A 12, B 15, A 14, B 18 as two series is forbidden — one y: 12 15 14 18',
  },
  pasted: {
    lookup_hit: 'Use NOAA ozone DU: 1980 2000, 1990 1800, 2000 1200, 2010 1100, 2020 1000',
    lookup_miss: 'I typed numbers but they are fake: 1980 9, 1990 8, 2000 7, 2010 6',
    in_progress: 'Jan 2.1 Feb 2.0 Mar 1.9 Apr 1.8 and do not invent May–Dec as fact',
    pasted_numbers: 'month,y\nJan,12\nFeb,15\nMar,14\nApr,18',
  },
  overloaded: {
    lookup_hit: 'Ozone hole and also Gini and also World Cup winners in one chart',
    lookup_miss: 'My startup KPIs plus climate plus sports in one picture',
    in_progress: 'YTD revenue and also forecast next decade and also a pie of users',
    pasted_numbers: '12 15 14 18 but also explain inflation and pick a color palette',
  },
};

const EXPECTED_TYPE: Record<PromptStyle, EvalPrompt['expectedType']> = {
  short: 'line',
  time: 'line',
  ranking: 'bar',
  compare: 'line',
  pasted: 'line',
  overloaded: 'bar',
};

const PASTED_YS = [12, 15, 14, 18];

function cellId(style: PromptStyle, situation: DataSituation): string {
  return `${style}__${situation}`;
}

export function evalGrid(): EvalPrompt[] {
  const cells: EvalPrompt[] = [];
  let domainIndex = 0;
  for (const style of PROMPT_STYLES) {
    for (const situation of DATA_SITUATIONS) {
      const expectedYs = situation === 'pasted_numbers' ? [...PASTED_YS] : undefined;
      const domain = DOMAIN_ROTATION[domainIndex % DOMAIN_ROTATION.length];
      cells.push({
        id: cellId(style, situation),
        style,
        situation,
        domain: domain ?? 'messy',
        prompt: PROMPT_TEXT[style][situation],
        expectedType: EXPECTED_TYPE[style],
        expectedYs,
      });
      domainIndex += 1;
    }
  }
  return cells;
}

export const EVAL_GRID: EvalPrompt[] = evalGrid();

export function promptById(id: string): EvalPrompt | undefined {
  return EVAL_GRID.find((cell) => cell.id === id);
}
