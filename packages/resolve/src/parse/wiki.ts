import { parseNumber } from '../normalize';
import type { SeriesRow } from '../types';

export type WikiTableSpec = {
  page: string;
  nameHeader: RegExp;
  valueHeader: RegExp;
  mode?: 'rank' | 'year';
  categoryHeader?: RegExp;
  categoryKeep?: RegExp;
  yearHeader?: RegExp;
};

type ParsedWiki = {
  rows: SeriesRow[];
  snapshotYear?: string;
  truncatedTo?: number;
};

function stripTags(html: string): string {
  return html
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cells(rowHtml: string): string[] {
  const out: string[] = [];
  const re = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rowHtml))) {
    out.push(stripTags(match[2] ?? ''));
  }
  return out;
}

function tableChunks(html: string): string[] {
  const out: string[] = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const table = match[0] ?? '';
    if (/wikitable/i.test(table) || /<th\b/i.test(table)) {
      out.push(table);
    }
  }
  return out;
}

function eachRow(html: string): { cells: string[]; after: number; html: string }[] {
  const out: { cells: string[]; after: number; html: string }[] = [];
  const trRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = trRe.exec(html))) {
    out.push({
      cells: cells(match[0]),
      after: match.index + match[0].length,
      html: match[0],
    });
  }
  return out;
}

function cellYear(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const years = [...value.matchAll(/\b((?:19|20)\d{2})\b/g)].map((match) => match[1] ?? '');
  const unique = [...new Set(years.filter(Boolean))];
  return unique.length === 1 ? unique[0] : undefined;
}

function oneSnapshotYear(years: Array<string | undefined>): string | undefined {
  if (years.length === 0 || years.some((year) => !year)) {
    return undefined;
  }
  const unique = [...new Set(years)];
  return unique.length === 1 ? unique[0] : undefined;
}

function parseWikiTablesDetailed(html: string, spec: WikiTableSpec): ParsedWiki {
  const collected: SeriesRow[] = [];
  const yearHeader = spec.yearHeader ?? /^year$/i;
  for (const table of tableChunks(html)) {
    const rowsHtml = eachRow(table);
    let nameCol = -1;
    let valueCol = -1;
    let categoryCol = -1;
    let yearCol = -1;
    let start = 0;
    for (let i = 0; i < rowsHtml.length; i += 1) {
      const names = rowsHtml[i]?.cells ?? [];
      const nextName = names.findIndex((name) => spec.nameHeader.test(name));
      const nextValue = names.findIndex((name) => spec.valueHeader.test(name));
      if (nextName >= 0 && nextValue >= 0) {
        nameCol = nextName;
        valueCol = nextValue;
        yearCol = names.findIndex((name) => yearHeader.test(name));
        if (yearCol === nameCol || yearCol === valueCol) {
          yearCol = -1;
        }
        if (spec.categoryHeader) {
          categoryCol = names.findIndex((name) => spec.categoryHeader?.test(name));
        }
        start = i + 1;
        break;
      }
    }
    if (nameCol < 0 || valueCol < 0) {
      continue;
    }
    const paired: Array<{ row: SeriesRow; year?: string }> = [];
    for (const row of rowsHtml.slice(start)) {
      const name = row.cells[nameCol];
      const value = row.cells[valueCol];
      if (!name || !value) {
        continue;
      }
      const y = parseNumber(value);
      if (y === undefined) {
        continue;
      }
      if (/^rank$|^#|^total$|^world$|^european union$|\bsystems\b/i.test(name)) {
        continue;
      }
      if (spec.categoryKeep && categoryCol >= 0) {
        const category = row.cells[categoryCol] ?? '';
        if (!spec.categoryKeep.test(category)) {
          continue;
        }
      }
      paired.push({
        row: { x: name.slice(0, 40), y },
        year: yearCol >= 0 ? cellYear(row.cells[yearCol]) : undefined,
      });
    }
    const rows = paired.map((item) => item.row);
    if (spec.mode === 'year') {
      collected.push(...rows);
      continue;
    }
    if (rows.length >= 3) {
      const sorted = [...paired].sort((a, b) => b.row.y - a.row.y);
      const kept = sorted.slice(0, 15);
      return {
        rows: kept.map((item) => item.row),
        snapshotYear: oneSnapshotYear(kept.map((item) => item.year)),
        ...(sorted.length > 15 ? { truncatedTo: 15 } : {}),
      };
    }
  }
  if (spec.mode === 'year') {
    const byYear = new Map<string, number>();
    for (const row of collected) {
      const year = row.x.match(/^(\d{4})/)?.[1];
      if (!year) {
        continue;
      }
      byYear.set(year, row.y);
    }
    return {
      rows: [...byYear.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([x, y]) => ({ x, y })),
    };
  }
  return { rows: [] };
}

export function parseWikiTables(html: string, spec: WikiTableSpec): SeriesRow[] {
  return parseWikiTablesDetailed(html, spec).rows;
}

export function parseWikiUnVotes(source: string): SeriesRow[] {
  const html = source.trimStart().startsWith('{') ? wikiHtml(source) : source;
  if (!html) {
    return [];
  }
  const rows: SeriesRow[] = [];
  let index = 0;
  for (const table of tableChunks(html)) {
    const parsed = eachRow(table);
    let voteCol = -1;
    let tallyCol = -1;
    let start = 0;
    for (let i = 0; i < parsed.length; i += 1) {
      const names = parsed[i]?.cells ?? [];
      const nextVote = names.findIndex((name) => /^vote$/i.test(name.trim()));
      const nextTally = names.findIndex((name) => /tally/i.test(name));
      if (nextVote >= 0 && nextTally >= 0) {
        voteCol = nextVote;
        tallyCol = nextTally;
        start = i + 1;
        break;
      }
    }
    if (voteCol < 0 || tallyCol < 0) {
      continue;
    }
    for (const row of parsed.slice(start)) {
      const vote = row.cells[voteCol] ?? '';
      if (!/in favour|yes/i.test(vote)) {
        continue;
      }
      const y = parseNumber(row.cells[tallyCol] ?? '');
      if (y === undefined) {
        continue;
      }
      index += 1;
      rows.push({ x: `ES-11/${index}`, y });
      break;
    }
  }
  return rows;
}

function wikiHtml(jsonText: string): string {
  let body: { parse?: { text?: { ['*']?: string } | string } };
  try {
    body = JSON.parse(jsonText) as { parse?: { text?: { ['*']?: string } | string } };
  } catch {
    return '';
  }
  const text = body.parse?.text;
  return typeof text === 'string' ? text : text?.['*'] ?? '';
}

function wikiPage(source: string, spec: WikiTableSpec): ParsedWiki {
  const html = source.trimStart().startsWith('{') ? wikiHtml(source) : source;
  if (!html) {
    return { rows: [] };
  }
  return parseWikiTablesDetailed(html, spec);
}

export function parseWikiApi(jsonText: string, spec: WikiTableSpec): SeriesRow[] {
  return wikiPage(jsonText, spec).rows;
}

export function readWiki(source: string, spec: WikiTableSpec): ParsedWiki {
  return wikiPage(source, spec);
}

export function wikiSnapshotYear(source: string, spec: WikiTableSpec): string | undefined {
  return wikiPage(source, spec).snapshotYear;
}

export function wikiParseUrl(page: string): string {
  const title = encodeURIComponent(page.replace(/ /g, '_'));
  return `https://en.wikipedia.org/w/api.php?action=parse&page=${title}&prop=text&format=json`;
}

export const WIKI_SPEC: Record<string, WikiTableSpec> = {
  languages_native: {
    page: 'List_of_languages_by_number_of_native_speakers',
    nameHeader: /language/i,
    valueHeader: /native/i,
  },
  refugees_hosted: {
    page: 'List_of_sovereign_states_by_refugee_population',
    nameHeader: /country|territory of asylum/i,
    valueHeader: /2024/,
  },
  un_votes_ukraine: {
    page: 'Eleventh_emergency_special_session_of_the_United_Nations_General_Assembly',
    nameHeader: /^vote$/i,
    valueHeader: /tally/i,
  },
  foundry_revenue: {
    page: 'Foundry_model',
    nameHeader: /^company$/i,
    valueHeader: /revenue/i,
  },
  solar_share: {
    page: 'Solar_power_by_country',
    nameHeader: /^country$/i,
    valueHeader: /%\s*gen/i,
  },
  gold_reserves: {
    page: 'Gold_reserve',
    nameHeader: /country/i,
    valueHeader: /holdings|tonnes/i,
  },
  volcano_deaths: {
    page: 'List_of_volcanic_eruptions_by_death_toll',
    nameHeader: /^volcano$/i,
    valueHeader: /death toll/i,
  },
  wild_tigers: {
    page: 'Tiger',
    nameHeader: /^country$/i,
    valueHeader: /estimate/i,
  },
  atlantic_hurricanes: {
    page: 'List_of_Atlantic_hurricane_seasons',
    nameHeader: /^year$/i,
    valueHeader: /^h$/i,
    mode: 'year',
  },
  hurricane_storm_deaths: {
    page: '2024_Atlantic_hurricane_season',
    nameHeader: /storm name/i,
    valueHeader: /^deaths$/i,
    categoryHeader: /storm category/i,
    categoryKeep: /hurricane/i,
  },
  wars_death_toll: {
    page: 'List_of_wars_by_death_toll',
    nameHeader: /^war$/i,
    valueHeader: /death range/i,
  },
};
