import { generateText, isStepCount, tool } from 'ai';
import { z } from 'zod';
import { LOOKUP_MODEL, LOOKUP_SONAR_MODEL } from './ai-models';
import { logAiFromResult } from './ai-usage';
import { gatherOfficialSeries } from './series';
import { firstPromptUrl } from './source';
import type { ResolvedSeries } from '@vizzy/resolve';

export type Gathered = {
  notes: string;
  urls: string[];
  official?: ResolvedSeries;
};

const FETCH_MS = 8000;
const MAX_PAGE = 24_000;

export function pastedATable(prompt: string): boolean {
  return prompt.split('\n').filter((line) => /\d/.test(line)).length >= 3;
}

export async function gatherFacts(
  asked: string,
  options?: { allowTools?: boolean }
): Promise<Gathered> {
  const seed = firstPromptUrl(asked);
  if (pastedATable(asked)) {
    return {
      notes: 'The user pasted numbers. Use those rows. Do not replace them.',
      urls: seed ? [seed] : [],
    };
  }

  const official = await gatherOfficialSeries(asked);
  if (official) {
    return {
      notes: official.notes,
      urls: uniqueUrls([seed, ...official.urls]),
      official: official.series,
    };
  }

  const fromSonar = await gatherWithSonar(asked);
  if (fromSonar && fromSonar.notes.length > 80) {
    return {
      notes: fromSonar.notes,
      urls: uniqueUrls([seed, ...fromSonar.urls]),
    };
  }

  if (options?.allowTools === false) {
    return {
      notes: fromSonar?.notes || '',
      urls: uniqueUrls([seed, ...fromSonar?.urls ?? []]),
    };
  }

  const found: string[] = seed ? [seed] : [];
  try {
  const lookupModel = LOOKUP_MODEL;
  const lookupResult = await generateText({
    model: lookupModel,
    maxRetries: 0,
    stopWhen: isStepCount(3),
    system:
      'You look up public numbers for a chart. Call search, then read_page on the best official or stats page. Aim for about 15 real rows on a ranking. A season or monthly series can be the full published set. Return a markdown table with the NAME in the first column (country, skill, team, city) and one metric. Never use Rank 1 or Country A as the name. Never the same name under Rank and under usage %. Plus the page URL. Do not stop at a top-3 highlight. If the page only has a few numbers, say so. Do not invent a table.',
    prompt: asked,
    tools: {
      search: tool({
        description: 'Search the public web. Returns titles, urls, and snippets.',
        inputSchema: z.object({ query: z.string().min(3).max(200) }),
        execute: async ({ query }) => {
          const results = await searchWeb(query);
          for (const result of results) {
            found.push(result.url);
          }
          return results;
        },
      }),
      read_page: tool({
        description: 'Fetch a public https page and return readable text.',
        inputSchema: z.object({ url: z.string().url() }),
        execute: async ({ url }) => {
          const page = await readPublicPage(url);
          if (page.ok) {
            found.push(url);
          }
          return page;
        },
      }),
    },
  });
  await logAiFromResult('lookup', lookupModel, lookupResult.usage, lookupResult.totalUsage);
  const text = lookupResult.text;

  return {
    notes: [fromSonar?.notes, text.trim()].filter(Boolean).join('\n\n'),
    urls: uniqueUrls([seed, ...fromSonar?.urls ?? [], ...found]),
  };
  } catch {
    return {
      notes: fromSonar?.notes || '',
      urls: uniqueUrls([seed, ...fromSonar?.urls ?? []]),
    };
  }
}

/** How many chart-ready rows the notes probably contain. */
export function countedSeriesRows(notes: string): number {
  const lines = notes.split('\n').map((line) => line.trim()).filter(Boolean);
  const table = lines.filter((line) => line.includes('|') && !/^[-|: ]+$/.test(line));
  if (table.length >= 3) {
    return table.filter((line) => /\d/.test(line)).length;
  }
  return lines.filter((line) => /[A-Za-z]/.test(line) && /\d/.test(line)).length;
}

async function gatherWithSonar(asked: string): Promise<Gathered | null> {
  try {
    const sonarModel = LOOKUP_SONAR_MODEL;
    const result = await generateText({
      model: sonarModel,
      maxRetries: 0,
      prompt: `Find the latest public numbers for this chart request. Aim for about 15 real rows on a ranking. A season or monthly series can be the full published set. Return a markdown table with the NAME in the first column (skill, team, city) and one metric. Never use Rank 1 as the name. Never the same name under Rank and under usage %. Include the exact source URL. Do not summarize a ranking as its top 3 unless the user asked for a top N. If the page only publishes a few numbers, return those and say the list is short. Do not invent rows.\n\n${asked}`,
    });
    await logAiFromResult('lookup_sonar', sonarModel, result.usage, result.totalUsage);
    const urls = urlsFromUnknown(result.sources).concat(urlsInText(result.text));
    return { notes: result.text.trim(), urls };
  } catch {
    return null;
  }
}

export async function searchWeb(
  query: string
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Vizzy/1.0 (public chart lookup)' },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const blocks = html.split('class="result__a"');
  for (const block of blocks.slice(1, 7)) {
    const href = block.match(/uddg=([^&"]+)/)?.[1] ?? block.match(/href="([^"]+)"/)?.[1];
    const title = stripTags(block.match(/>([^<]+)<\/a>/)?.[1] ?? '');
    const snippet = stripTags(block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/)?.[1] ?? '');
    if (!href) {
      continue;
    }
    let url = '';
    try {
      url = decodeURIComponent(href);
    } catch {
      url = href;
    }
    if (!isPublicHttpUrl(url) || !title) {
      continue;
    }
    results.push({ title: title.slice(0, 160), url, snippet: snippet.slice(0, 240) });
  }
  return results;
}

export async function readPublicPage(
  url: string
): Promise<{ ok: true; url: string; text: string } | { ok: false; error: string }> {
  if (!isPublicHttpUrl(url)) {
    return { ok: false, error: 'Only public http(s) pages' };
  }
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Vizzy/1.0 (public chart lookup)', Accept: 'text/html,text/plain' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!response.ok) {
      return { ok: false, error: `Page returned ${response.status}` };
    }
    const raw = (await response.text()).slice(0, MAX_PAGE * 2);
    return { ok: true, url, text: readableText(raw).slice(0, MAX_PAGE) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not read page' };
  }
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '0.0.0.0') {
      return false;
    }
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 169 && b === 254)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function readableText(html: string): string {
  return stripTags(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  );
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function urlsInText(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)]
    .map((match) => match[0].replace(/[.,;:]+$/, ''))
    .filter(isPublicHttpUrl);
}

function urlsFromUnknown(sources: unknown): string[] {
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources.flatMap((item) => {
    if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string' && isPublicHttpUrl(item.url)) {
      return [item.url];
    }
    return [];
  });
}

function uniqueUrls(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    if (!value || !isPublicHttpUrl(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    urls.push(value);
  }
  return urls;
}
