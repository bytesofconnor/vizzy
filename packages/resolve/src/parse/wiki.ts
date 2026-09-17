import { parseNumber } from '../normalize';
import type { SeriesRow } from '../types';

export type WikiTableSpec = {
  page: string;
  nameHeader: RegExp;
  valueHeader: RegExp;
};

function stripTags(html: string): string {
  return html
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
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

function headerRow(tableHtml: string): { names: string[]; body: string } | null {
  const tr = tableHtml.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/i);
  if (!tr) {
    return null;
  }
  return { names: cells(tr[0]), body: tableHtml.slice((tr.index ?? 0) + tr[0].length) };
}

export function parseWikiTables(html: string, spec: WikiTableSpec): SeriesRow[] {
  for (const table of tableChunks(html)) {
    const header = headerRow(table);
    if (!header) {
      continue;
    }
    const nameCol = header.names.findIndex((name) => spec.nameHeader.test(name));
    const valueCol = header.names.findIndex((name) => spec.valueHeader.test(name));
    if (nameCol < 0 || valueCol < 0) {
      continue;
    }
    const rows: SeriesRow[] = [];
    const trRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
    let match: RegExpExecArray | null;
    while ((match = trRe.exec(header.body))) {
      const cols = cells(match[0]);
      const name = cols[nameCol];
      const value = cols[valueCol];
      if (!name || !value) {
        continue;
      }
      const y = parseNumber(value);
      if (y === undefined) {
        continue;
      }
      if (/^rank$|^#|^total$/i.test(name)) {
        continue;
      }
      rows.push({ x: name.slice(0, 40), y });
      if (rows.length >= 15) {
        break;
      }
    }
    if (rows.length >= 3) {
      return rows;
    }
  }
  return [];
}

export function parseWikiApi(jsonText: string, spec: WikiTableSpec): SeriesRow[] {
  let body: { parse?: { text?: { ['*']?: string } | string } };
  try {
    body = JSON.parse(jsonText) as { parse?: { text?: { ['*']?: string } | string } };
  } catch {
    return [];
  }
  const text = body.parse?.text;
  const html = typeof text === 'string' ? text : text?.['*'];
  if (!html) {
    return [];
  }
  return parseWikiTables(html, spec);
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
  eurovision_wins: {
    page: 'Eurovision_Song_Contest',
    nameHeader: /country/i,
    valueHeader: /^wins$|number of wins/i,
  },
  olympic_100m_men: {
    page: '100_metres_at_the_Olympics',
    nameHeader: /games|year/i,
    valueHeader: /time/i,
  },
};
