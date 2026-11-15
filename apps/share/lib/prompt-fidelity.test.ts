import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolvePrompt, type SeriesRow } from '@vizzy/resolve';
import { alignPlottedClaims } from './plotted-claims';
import { heuristicInsight } from './insight-heuristic';
import { mintFromOfficial } from './official-mint';
import { seedFromPiece } from './seed';

const NOW = Date.UTC(2026, 10, 15);
const MALFORMED = /\d{4}-\d{5,}|\d{4}-\d+\.\d{2,}/;

type FidelityPrompt = {
  id: string;
  text: string;
  series: string[];
  since?: number;
  until?: number;
  topN?: number;
  quarters?: boolean;
  coverage?: string;
  forbidSource?: string;
  timeSeries?: boolean;
};

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../eval/fixtures/prompt-fidelity.json'), 'utf8')
) as { clock: string; prompts: FidelityPrompt[] };

function yearOf(value: string): number | undefined {
  const quarter = value.match(/^q[1-4]\s+((?:19|20)\d{2})$/i);
  if (quarter?.[1]) {
    return Number(quarter[1]);
  }
  const leading = value.match(/^((?:1[89]|20)\d{2})(?:$|[-/.])/);
  return leading?.[1] ? Number(leading[1]) : undefined;
}

function monthly(id: string, start: string, end: string, valueAt: (year: number, month: number) => number): string {
  const lines = [`observation_date,${id}`];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const stamp = `${year}-${String(month).padStart(2, '0')}`;
    lines.push(`${stamp}-01,${valueAt(year, month)}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return lines.join('\n');
}

function annual(id: string, first: number, last: number): string {
  const lines = [`observation_date,${id}`];
  for (let year = first; year <= last; year += 1) {
    lines.push(`${year}-01-01,${20000 + year}`);
  }
  return lines.join('\n');
}

function weekly(id: string, firstYear: number, lastStamp: string): string {
  const lines = [`observation_date,${id}`];
  const end = new Date(`${lastStamp}T00:00:00Z`);
  const cursor = new Date(Date.UTC(firstYear, 0, 5));
  while (cursor <= end) {
    const stamp = cursor.toISOString().slice(0, 10);
    lines.push(`${stamp},${(7 + (cursor.getUTCFullYear() % 5) / 10).toFixed(2)}`);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return lines.join('\n');
}

function quarters(id: string, firstYear: number, lastYear: number, lastQuarter: number): string {
  const lines = [`observation_date,${id}`];
  const months = [1, 4, 7, 10];
  for (let year = firstYear; year <= lastYear; year += 1) {
    months.forEach((month, index) => {
      const quarter = index + 1;
      if (year === lastYear && quarter > lastQuarter) {
        return;
      }
      lines.push(`${year}-${String(month).padStart(2, '0')}-01,${(year % 7) - 2}`);
    });
  }
  return lines.join('\n');
}

function solarTable(): string {
  const rows = Array.from({ length: 20 }, (_, index) => {
    const name = `Country ${String(index + 1).padStart(2, '0')}`;
    return `<tr><td>${name}</td><td>${40 - index}</td></tr>`;
  }).join('');
  const html = `<table class="wikitable"><tr><th>Country</th><th>% gen</th></tr>${rows}</table>`;
  return JSON.stringify({ parse: { text: { '*': html } } });
}

function co2Csv(): string {
  const lines = ['Entity,Code,Year,Annual CO2 emissions per capita'];
  for (let index = 0; index < 16; index += 1) {
    lines.push(`Country ${String(index + 1).padStart(2, '0')},C${index},2022,${30 - index}`);
  }
  lines.push('Other economies,OWID_OTH,2022,500');
  return lines.join('\n');
}

function temperatureCsv(): string {
  const lines = ['Entity,Code,Year,Average,Lower bound,Upper bound'];
  for (let year = 1850; year <= 2026; year += 1) {
    lines.push(`World,OWID_WRL,${year},${((year - 1850) / 100).toFixed(3)},0,0`);
  }
  return lines.join('\n');
}

function arcticCsv(): string {
  const lines = ['Entity,Year,Minimum (September),Maximum (March)'];
  for (let year = 1979; year <= 2026; year += 1) {
    lines.push(`Arctic Ocean,${year},${(7 - (year - 1979) / 40).toFixed(3)},${(15).toFixed(3)}`);
  }
  return lines.join('\n');
}

async function canned(url: string): Promise<string> {
  if (url.includes('UNRATE')) {
    return monthly('UNRATE', '1948-01', '2026-10', (year, month) => 4 + (month % 3) / 10);
  }
  if (url.includes('A191RL1Q225SBEA')) {
    return quarters('A191RL1Q225SBEA', 1947, 2026, 3);
  }
  if (url.includes('MEHOINUSMNA646N')) {
    return annual('MEHOINUSMNA646N', 1984, 2025);
  }
  if (url.includes('MORTGAGE30US')) {
    return weekly('MORTGAGE30US', 1971, '2026-11-12');
  }
  if (url.includes('CPIAUCSL')) {
    return monthly('CPIAUCSL', '2010-01', '2026-10', (year, month) => 100 * 1.02 ** (year - 2010 + month / 12));
  }
  if (url.includes('FEDFUNDS')) {
    return monthly('FEDFUNDS', '2010-01', '2026-10', () => 2.5);
  }
  if (url.includes('co-emissions-per-capita')) {
    return co2Csv();
  }
  if (url.includes('Solar_power_by_country')) {
    return solarTable();
  }
  if (url.includes('temperature-anomaly')) {
    return temperatureCsv();
  }
  if (url.includes('arctic-sea-ice')) {
    return arcticCsv();
  }
  return '';
}

function yearsOf(rows: SeriesRow[]): number[] {
  return rows.map((row) => yearOf(String(row.x))).filter((year): year is number => year !== undefined);
}

describe('prompt fidelity', () => {
  it('locks the Nov 14 set at 14 prompts', () => {
    expect(fixture.clock).toBe(new Date(NOW).toISOString().slice(0, 10));
    expect(fixture.prompts).toHaveLength(14);
    for (const prompt of fixture.prompts) {
      expect(prompt.series.length).toBeGreaterThan(0);
      expect(prompt.text.length).toBeGreaterThan(8);
    }
  });

  it('does not glue a date label to the plotted value', () => {
    const peak = alignPlottedClaims('2006-04 sits at the high end of the index.', [
      { x: '2006-04', y: 2119 },
      { x: '2025-11', y: 118659.97 },
    ]);
    const latest = alignPlottedClaims('2025-11 is the latest month.', [
      { x: '2006-04', y: 2119 },
      { x: '2025-11', y: 118659.97 },
    ]);
    expect(peak).toContain('2006-04');
    expect(latest).toContain('2025-11');
    expect(`${peak} ${latest}`).not.toMatch(MALFORMED);
    expect(peak).not.toContain('2006-2119');
    expect(latest).not.toContain('2025-118659.97');
  });

  it.each(fixture.prompts)('$id matches the asked series, span, and rank', async (prompt) => {
    const series = await resolvePrompt(prompt.text, { get: canned, now: NOW });
    expect(series, prompt.text).not.toBeNull();
    if (!series) {
      return;
    }
    const got = series.seriesId.split('+').sort();
    expect(got).toEqual([...prompt.series].sort());
    const label = `${series.sourceLabel} ${series.sourceUrl}`.toLowerCase();
    if (prompt.forbidSource) {
      expect(label).not.toContain(prompt.forbidSource);
    }
    expect(label).not.toContain('bankrate');
    if (prompt.topN) {
      expect(series.rows).toHaveLength(prompt.topN);
      expect(series.truncatedTo).toBe(prompt.topN);
      expect(series.rows.some((row) => /other economies/i.test(String(row.x)))).toBe(false);
    }
    if (prompt.quarters) {
      expect(series.rows.length).toBeGreaterThanOrEqual(40);
      expect(series.rows.every((row) => /^Q[1-4] \d{4}$/.test(String(row.x)))).toBe(true);
    }
    const years = yearsOf(series.rows);
    if (prompt.since !== undefined) {
      expect(Math.min(...years)).toBe(prompt.since);
    }
    if (prompt.until !== undefined) {
      expect(Math.max(...years)).toBe(prompt.until);
    }
    if (prompt.series.includes('CPIAUCSL')) {
      const inflation = series.rows.filter((row) => row.series === 'CPI inflation');
      const funds = series.rows.filter((row) => row.series === 'Federal funds rate');
      expect(inflation.length).toBeGreaterThan(12);
      expect(funds.length).toBeGreaterThan(12);
      expect(inflation.every((row) => row.y < 30)).toBe(true);
    }
    const minted = mintFromOfficial(prompt.text, series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const title = minted.piece.title;
    const note = minted.piece.note;
    const stated = `${title} ${note}`;
    if (prompt.since !== undefined && prompt.until !== undefined) {
      expect(stated).toContain(String(prompt.since));
      expect(stated).toContain(String(prompt.until));
      expect(title).toContain(String(prompt.since));
      expect(title).toContain(String(prompt.until));
      expect(note).toContain(String(prompt.since));
      expect(note).toContain(String(prompt.until));
    }
    if (prompt.topN) {
      const tops = stated.match(new RegExp(`\\btop\\s+${prompt.topN}\\b`, 'gi')) ?? [];
      expect(tops.length).toBeGreaterThan(0);
      expect(stated).not.toMatch(new RegExp(`\\btop\\s+(?!${prompt.topN}\\b)\\d+\\b`, 'i'));
      expect(minted.piece.data).toHaveLength(prompt.topN);
    }
    if (prompt.coverage) {
      expect(title.toLowerCase()).toContain(prompt.coverage.toLowerCase());
      expect(note.toLowerCase()).toContain(prompt.coverage.toLowerCase());
    }
    expect(stated).not.toMatch(MALFORMED);
    expect(stated).not.toMatch(/history was not provided|wasn't provided|was not provided/i);
    if (prompt.timeSeries) {
      const insight = heuristicInsight(seedFromPiece(minted.piece));
      expect(insight).not.toMatch(MALFORMED);
      expect(insight).not.toMatch(/\bleads\b|\bwell ahead\b|\bhigh end\b|\bother end\b/i);
      expect(insight).not.toMatch(/history was not provided|wasn't provided/i);
      if (prompt.since !== undefined && prompt.until !== undefined) {
        expect(insight).toContain(String(prompt.since));
        expect(insight).toContain(String(prompt.until));
      }
    }
  });
});
