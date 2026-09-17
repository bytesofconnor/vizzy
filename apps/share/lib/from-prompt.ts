import { generateText, Output } from 'ai';
import { z } from 'zod';
import { forecastStartIndex } from '@vizzy/core';
import { matchPrompt } from '@vizzy/resolve';
import { countedSeriesRows, gatherFacts, pastedATable } from './lookup';
import { mintPiece, type MintResult } from './mint';
import { isGrayscaleOnlyRevision, wantsPrintGrayscale } from './print-grayscale';
import { tryLocalRevision } from './revision-apply';
import {
  followUpNeedsLookup,
  isUnsupportedVizOnlyRevision,
  mintInputFromSeed,
  revisionLookupQuery,
  revisionYearSpan,
  seedBriefing,
  yearishRows,
  type ChartSeed,
} from './seed';
import { COMPOSE_MODELS } from './ai-models';
import { logAiFromResult } from './ai-usage';
import {
  composeModelsForRevision,
  GATEWAY_NO_RETRY,
  isGatewayRateLimited,
  shouldSkipGoogleModel,
} from './gateway-errors';
import { mostlyGenericPlaceholders, relabelGenericCategories } from './category-labels';
import { lookupDetail, reportProgress, type ComposeProgressReporter } from './compose-progress';
import {
  estimateBasisEvidence,
  firstPromptUrl,
  meaningfulSourceLabel,
  normalizeInventedSource,
  sourceLabelFor,
  sourceMethodFor,
} from './source';

const DraftSchema = z.object({
  title: z.string().describe('Short sentence that is the chart title'),
  kicker: z.string().describe('Two or three word label above the title'),
  note: z.string().describe('One dry sentence under the chart'),
  chartType: z.enum(['bar', 'line', 'scatter']),
  area: z.boolean().describe('True only for a line that should fill under the stroke'),
  xLabel: z.string().describe('Human x-axis name. Month, season, shop. Never the letter x'),
  yLabel: z.string().describe('Human y-axis name with units. Wins, cash $k, rate %. Never the letter y'),
  sourceLabel: z.string().describe('Who or what the rows are from'),
  sourceMethod: z.enum(['official', 'export', 'scraped', 'estimate', 'manual', 'example', 'unknown']),
  evidence: z.string().describe('What the rows actually are, in a few words'),
  rows: z
    .array(
      z.object({
        x: z.union([z.string(), z.number()]).describe('Category, year, or numeric x'),
        y: z.number().describe('Numeric y'),
      })
    )
    .min(2)
    .max(60),
});

const SYSTEM = `You emit a Vizzy chart draft. Types: bar, line, scatter only. No pie.
Use the user's numbers when they paste a table.
If LOOKED-UP NOTES contain a real series, chart those numbers. Do not invent a different table.
Aim for about 15 rows on a ranking or named-category bar chart. A year by month is 12. A season is the published games so far. Do not pad past the natural series. Only take a top N when the user asked for one.
If the user asked for decades of a yearly series (last 30 years, past 50 years), emit one row per year and prefer a line. Sequential year series may run up to about 50 points.
If LOOKED-UP NOTES contain real numbers with a page, chart them and set sourceMethod scraped or official. Attach the page in sourceLabel. Put the page URL in SOURCE CANDIDATES on the chart when you have one.
If lookup failed and the user pasted no numbers, return sourceMethod estimate only when you must illustrate shape — never pretend it is published data. sourceLabel must name what you tried to find (topic or site), never the single word Estimate. evidence must say lookup failed and that rows are illustrative. Even then, x must be real names from the question (Japan, Brazil, Arsenal) — never Country A, Team B, Item 1, or any letter-or-number placeholder.
If the asked year is still in progress, chart published months from the notes and mark later months as forecast in the note. sourceMethod estimate only for the unpublished tail. Never attach a URL to purely invented rows.
Always name xLabel and yLabel in words a reader can trust (Month, Wins, Points). Never leave them as x or y.
Never invent a source URL. Prefer the looked-up page title in sourceLabel.
y must be numeric. Keep titles short. Named categories cap around 15. Sequential series may be longer.
If y is a calendar year, keep it as the year. Do not convert it to a count from zero.
Keep category names short enough to sit under a bar: August Schell, not August Schell Brewing Company.
x is the name of each thing (skill, team, city, country). Never Rank 1, #3, Country A, or a place index. A top-10 chart still labels each bar with the name. For a country chart with no lookup, pick diverse real countries the reader recognizes.
One comparison per chart. Each x value is one thing, once. Never "Claude Code (Rank)" and "Claude Code (usage %)". Pick one metric for y. Rank (lower is better) and a percentage (higher is better) must never share a chart.
If CURRENT CHART is in the prompt, this is a second pass on that chart. Keep those rows unless the follow-up asks to drop, add, sort, change numbers, or widen the time window. Honor the follow-up. If they ask for more years than CURRENT CHART has, use LOOKED-UP NOTES for the longer series — do not keep the short window. Do not switch subjects. Keep the existing source unless LOOKED-UP NOTES contain a new published series. Never set sourceMethod to estimate just because the user filtered or restyled the current rows.`;

export function publicComposeError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/free tier|credits|upgrade|unauthorized|api key|gateway|rate limit|429|403/i.test(message)) {
    return 'Could not generate that chart. Try again in a moment.';
  }
  if (!message || message.length > 140) {
    return 'Could not generate that chart';
  }
  return message;
}

export async function pieceFromPrompt(
  prompt: string,
  from?: ChartSeed,
  onProgress?: ComposeProgressReporter
): Promise<MintResult> {
  const asked = prompt.trim();
  if (asked.length < 3) {
    return { ok: false, error: 'Say what to chart', issues: [] };
  }
  if (asked.length > 4000) {
    return { ok: false, error: 'Keep it under 4000 characters', issues: [] };
  }
  if (from && isUnsupportedVizOnlyRevision(asked)) {
    return {
      ok: false,
      error: 'Vizzy draws bar, line, and scatter charts. Ask for one of those, or another change to this series.',
      issues: [],
    };
  }

  reportProgress(onProgress, {
    stage: 'queue',
    progress: 10,
    message: from ? 'Reading your revision…' : 'Reading your prompt…',
  });

  if (from && isGrayscaleOnlyRevision(asked)) {
    reportProgress(onProgress, {
      stage: 'mint',
      progress: 86,
      message: 'Switching to print grayscale…',
    });
    return mintPiece(mintInputFromSeed(from, { printGrayscale: true }));
  }

  if (from) {
    const local = tryLocalRevision(from, asked);
    if (local?.ok === false) {
      return { ok: false, error: local.error, issues: [] };
    }
    if (local?.ok === true) {
      reportProgress(onProgress, {
        stage: 'mint',
        progress: 86,
        message: 'Updating this chart…',
      });
      return mintPiece(mintInputFromSeed(local.seed));
    }
  }

  const lookup = !from || followUpNeedsLookup(asked, from);
  const lookupAsked = from && lookup ? revisionLookupQuery(asked, from) : asked;
  let gathered = { notes: '', urls: [] as string[] };
  if (lookup) {
    reportProgress(onProgress, {
      stage: 'lookup',
      progress: 18,
      message: matchPrompt(lookupAsked) ? 'Reading an official series…' : 'Searching public sources…',
    });
    try {
      gathered = await gatherFacts(lookupAsked, { allowTools: !from });
    } catch {
      gathered = { notes: '', urls: [] };
    }
    reportProgress(onProgress, {
      stage: 'lookup',
      progress: 38,
      message: 'Lookup complete',
      detail: lookupDetail(gathered, pastedATable(asked)),
    });
  } else {
    reportProgress(onProgress, {
      stage: 'lookup',
      progress: 38,
      message: 'Using your current chart',
      detail: 'Revising in place',
    });
  }

  if (from) {
    const span = revisionYearSpan(asked);
    const haveYears = yearishRows(from.rows).length;
    if (span !== undefined && haveYears < span && !/\d/.test(gathered.notes)) {
      return {
        ok: false,
        error: `This chart only has ${from.rows.length} point${from.rows.length === 1 ? '' : 's'}. I couldn't find a published ${span}-year series to fill in. Paste a table, or try something I can do here — like make it a line.`,
        issues: [],
      };
    }
  }

  const briefing = [
    from ? seedBriefing(from) : '',
    gathered.notes
      ? `LOOKED-UP NOTES:\n${gathered.notes.slice(0, 6000)}\n\nSOURCE CANDIDATES:\n${gathered.urls.slice(0, 5).join('\n') || '(none)'}`
      : '',
    `USER ASKED:\n${asked}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  reportProgress(onProgress, {
    stage: 'draft',
    progress: 48,
    message: 'Drafting chart…',
  });

  let lastError: unknown;
  let googleLimited = false;
  const models = composeModelsForRevision(Boolean(from));
  for (const model of models) {
    if (shouldSkipGoogleModel(model, googleLimited)) {
      continue;
    }
    try {
      let output = await draftChart(model, briefing);
      if (!output) {
        lastError = new Error('Could not draft a chart');
        continue;
      }

      const hinted = countedSeriesRows(gathered.notes);
      if (!from && output.rows.length < 8 && hinted >= 12) {
        reportProgress(onProgress, {
          stage: 'draft',
          progress: 56,
          message: 'Adding rows from source…',
        });
        const richer = await draftChart(
          model,
          `${briefing}\n\nThe first draft only used ${output.rows.length} rows. The notes have about ${hinted}. Emit about 15 rows from the notes. One name per row. One metric for y. Do not invent extras.`
        );
        if (richer && richer.rows.length > output.rows.length) {
          output = richer;
        }
      }
      if (mostlyRankIndex(output.rows)) {
        reportProgress(onProgress, {
          stage: 'draft',
          progress: 62,
          message: 'Naming each bar…',
        });
        const named = await draftChart(
          model,
          `${briefing}\n\nThe first draft labeled bars Rank 1, Rank 2. That is not a chart. x must be the skill or item NAME from the notes. y is the score or count. Do not use Rank 1 as x.`
        );
        if (named && !mostlyRankIndex(named.rows)) {
          output = named;
        }
      }
      if (mostlyGenericPlaceholders(output.rows)) {
        reportProgress(onProgress, {
          stage: 'draft',
          progress: 66,
          message: 'Replacing placeholder labels…',
        });
        const named = await draftChart(
          model,
          `${briefing}\n\nThe first draft used placeholder labels like Country A or Item 1. Replace every x with a REAL name from the user's question or notes (country, city, team, product). Illustrative y values are fine. Never Country A, Team B, or Item 3.`
        );
        if (named && !mostlyGenericPlaceholders(named.rows)) {
          output = named;
        }
      }

      reportProgress(onProgress, {
        stage: 'draft',
        progress: 74,
        message: rowProgressMessage(output.chartType, output.rows.length),
        barCount: output.rows.length,
        detail: output.title.trim().slice(0, 88),
      });

      reportProgress(onProgress, {
        stage: 'mint',
        progress: 86,
        message: 'Building chart…',
        barCount: output.rows.length,
      });

      return mintDraft(asked, gathered, output, from);
    } catch (error) {
      lastError = error;
      console.error('compose draft failed', model, error);
      if (isGatewayRateLimited(error) && model.startsWith('google/')) {
        googleLimited = true;
      }
    }
  }

  if (from) {
    if (isRateLimited(lastError)) {
      return {
        ok: false,
        error:
          'Could not reach the drafting model. Try again in a moment. I can still sort this chart, switch to a line, or drop a year that’s already on it without a lookup.',
        issues: [],
      };
    }
    return { ok: false, error: publicComposeError(lastError) || 'Could not revise that', issues: [] };
  }
  if (isRateLimited(lastError)) {
    return {
      ok: false,
      error: 'The drafting model is busy. Try again in a moment, or paste a table.',
      issues: [],
    };
  }
  return {
    ok: false,
    error: 'Could not find published numbers for that. Paste a table or put a source URL in your prompt.',
    issues: [],
  };
}

async function draftChart(model: (typeof COMPOSE_MODELS)[number], prompt: string) {
  try {
    return await draftChartOnce(model, prompt);
  } catch (error) {
    if (model.startsWith('openai/') && isGatewayRateLimited(error)) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return await draftChartOnce(model, prompt);
    }
    throw error;
  }
}

async function draftChartOnce(model: (typeof COMPOSE_MODELS)[number], prompt: string) {
  const result = await generateText({
    model,
    output: Output.object({ schema: DraftSchema }),
    system: SYSTEM,
    prompt,
    maxRetries: GATEWAY_NO_RETRY,
  });
  await logAiFromResult('compose', model, result.usage, result.totalUsage);
  return result.output;
}

function mintDraft(
  asked: string,
  gathered: { notes: string; urls: string[] },
  output: z.infer<typeof DraftSchema>,
  from?: ChartSeed
): MintResult {
  let estimated = output.sourceMethod === 'estimate' || output.sourceMethod === 'example';
  const lookedUp = gathered.urls.length > 0 && /\d/.test(gathered.notes) && !estimated;
  if (from && estimated && !lookedUp) {
    estimated = false;
  }
  if (estimated) {
    const basis = estimateBasisEvidence(output.evidence, {
      asked,
      lookupNotes: gathered.notes,
      lookupUrls: gathered.urls,
    });
    if (basis.length < 20) {
      return {
        ok: false,
        error: 'Could not find published numbers for that. Paste a table or put a source URL in your prompt.',
        issues: [],
      };
    }
  }
  const keepSource = Boolean(from) && !lookedUp && !estimated;
  const sourceUrl = keepSource
    ? from?.sourceUrl
    : firstPromptUrl(asked) ?? (estimated ? undefined : gathered.urls[0] ?? from?.sourceUrl);
  const method = keepSource
    ? from!.sourceMethod
    : estimated
      ? output.sourceMethod
      : lookedUp && output.sourceMethod === 'unknown'
        ? 'scraped'
        : output.sourceMethod === 'unknown' && sourceUrl
          ? 'scraped'
          : output.sourceMethod;
  if (!from && !estimated && !sourceUrl && !meaningfulSourceLabel(output.sourceLabel)) {
    return {
      ok: false,
      error: 'Could not find published numbers for that. Paste a table or put a source URL in your prompt.',
      issues: [],
    };
  }
  const tidied = tidyComparison(
    output.rows.map((row) => ({
      x: output.chartType === 'scatter' ? row.x : String(row.x),
      y: row.y,
    })),
    output.xLabel.trim() || fallbackXLabel(output.chartType),
    output.yLabel.trim() || 'Value'
  );
  const named = withNamedCategories(tidied.rows, gathered.notes, tidied.xLabel, asked);
  if (output.chartType !== 'scatter' && mostlyRankIndex(named.rows) && !from) {
    return { ok: false, error: 'Could not find named figures to chart', issues: [] };
  }
  const noteNames = namesFromNotes(gathered.notes);
  let rows = relabelGenericCategories(named.rows, noteNames, asked);
  if (output.chartType !== 'scatter' && mostlyGenericPlaceholders(rows)) {
    if (!from) {
      return {
        ok: false,
        error: 'Could not find published numbers for that. Paste a table or put a source URL in your prompt.',
        issues: [],
      };
    }
    rows = from.rows.map((row) => ({ x: row.x, y: row.y }));
  }
  if (output.chartType !== 'scatter' && mostlyRankIndex(rows) && from) {
    rows = from.rows.map((row) => ({ x: row.x, y: row.y }));
  }
  const xLabel = named.xLabel;
  const yLabel = tidied.yLabel;
  const forecastAt = output.chartType === 'line' ? forecastStartIndex(rows, 'x') : -1;
  const forecastFrom = forecastAt >= 0 ? String(rows[forecastAt]?.x ?? '') : '';

  const source = normalizeInventedSource(
    {
      label: keepSource
        ? from!.sourceLabel
        : sourceLabelFor(sourceUrl, output.sourceLabel),
      method: keepSource ? method : sourceMethodFor(sourceUrl, method),
      evidence: keepSource ? from!.evidence || output.evidence : output.evidence,
      url: sourceUrl,
    },
    { asked, lookupNotes: gathered.notes, lookupUrls: gathered.urls }
  );

  return mintPiece({
    title: output.title,
    kicker: estimated ? output.kicker || 'Illustrative' : output.kicker,
    note: output.note,
    data: rows,
    source,
    printGrayscale: wantsPrintGrayscale(asked),
    config: {
      chart: {
        type: output.chartType,
        ...(output.chartType === 'bar' ? { barPadding: 0.32 } : {}),
        ...(output.chartType === 'line' && output.area ? { area: true, curve: 'linear' } : {}),
        ...(forecastFrom ? { forecastFrom } : {}),
      },
      dataMapping: { x: 'x', y: 'y' },
      axes: {
        x: { show: true, grid: false, label: xLabel.slice(0, 40) },
        y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 5, label: yLabel.slice(0, 40) },
      },
    },
  });
}

function rowProgressMessage(chartType: 'bar' | 'line' | 'scatter', count: number): string {
  if (chartType === 'line') {
    return `Plotting ${count} points`;
  }
  if (chartType === 'scatter') {
    return `Placing ${count} points`;
  }
  return `Drawing ${count} bars`;
}

function isRateLimited(error: unknown): boolean {
  if (isGatewayRateLimited(error)) {
    return true;
  }
  return /free tier|credits/i.test(error instanceof Error ? error.message : '');
}

const NAMED_METRIC = /^(.+?)\s*\(([^)]+)\)\s*$/;
const NAMED_CAP = 15;
const RANK_INDEX = /^(?:#|no\.?|number|rank|place|pos(?:ition)?)\s*#?\s*\d+$/i;
const BARE_INDEX = /^\d{1,2}$/;

export function isRankIndexX(value: string): boolean {
  const n = value.trim();
  return RANK_INDEX.test(n) || BARE_INDEX.test(n);
}

export function mostlyRankIndex(rows: Array<{ x: string | number }>): boolean {
  if (rows.length < 3) {
    return false;
  }
  const hits = rows.filter((row) => isRankIndexX(String(row.x))).length;
  return hits >= Math.ceil(rows.length * 0.8);
}

export function namesFromNotes(notes: string): string[] {
  const lines = notes.split('\n').map((line) => line.trim()).filter(Boolean);
  const table = lines.filter((line) => line.includes('|') && !/^[-|:.\s]+$/.test(line));
  if (table.length >= 3) {
    const cells = (line: string) => line.split('|').map((cell) => cell.trim()).filter(Boolean);
    const header = cells(table[0] ?? '');
    let index = header.findIndex((cell) =>
      /^(skill|name|title|tool|item|package|repo|city|team|player|company|country|nation|economy|state|region)/i.test(cell)
    );
    if (index < 0) {
      index = header.findIndex((cell) => !/rank|#|score|rating|stars|count|downloads|%|url|date/i.test(cell));
    }
    if (index >= 0) {
      const names = table
        .slice(1)
        .map((line) => cleanName(cells(line)[index] ?? ''))
        .filter((name) => name && !isRankIndexX(name));
      if (names.length >= 2) {
        return uniqueNames(names).slice(0, NAMED_CAP);
      }
    }
  }

  const listed: string[] = [];
  for (const line of lines) {
    const match =
      line.match(/^\d{1,2}[.)]\s+[*_]*([A-Za-z][^|([]{1,60}?)[*_]*\s*(?:[—–|:(-]|score|$)/i) ??
      line.match(/^[-*]\s+[*_[]*([A-Za-z][^|\]]{1,60}?)[\]]*\s*(?:[—–|:(-]|$)/);
    const name = cleanName(match?.[1] ?? '');
    if (name && !isRankIndexX(name)) {
      listed.push(name);
    }
  }
  return uniqueNames(listed).slice(0, NAMED_CAP);
}

export function withNamedCategories(
  rows: DraftRow[],
  notes: string,
  xLabel: string,
  asked = ''
): { rows: DraftRow[]; xLabel: string } {
  if (!mostlyRankIndex(rows)) {
    return { rows, xLabel };
  }
  const names = namesFromNotes(notes);
  if (names.length < 2) {
    return { rows, xLabel };
  }
  const next = rows.slice(0, Math.min(rows.length, names.length)).map((row, index) => ({
    x: names[index]!,
    y: row.y,
  }));
  return { rows: next, xLabel: nameAxisLabel(xLabel, asked) };
}

function nameAxisLabel(xLabel: string, asked: string): string {
  if (/skill/i.test(xLabel) || /skill/i.test(asked)) {
    return 'Skill';
  }
  if (/country|nation/i.test(xLabel) || /\b(countr(y|ies)|nation|nations)\b/i.test(asked)) {
    return 'Country';
  }
  if (/rank/i.test(xLabel)) {
    return 'Name';
  }
  return xLabel;
}

function cleanName(value: string): string {
  return value.replace(/\*\*/g, '').replace(/^\[|\]$/g, '').replace(/\s+/g, ' ').trim();
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(name);
  }
  return out;
}

type DraftRow = { x: string | number; y: number };

export function tidyComparison(
  rows: DraftRow[],
  xLabel: string,
  yLabel: string
): { rows: DraftRow[]; xLabel: string; yLabel: string } {
  const parsed = rows.map((row) => {
    const raw = String(row.x);
    const match = raw.match(NAMED_METRIC);
    return {
      name: match?.[1]?.trim() || raw,
      metric: match?.[2]?.trim() || '',
      x: row.x,
      y: row.y,
    };
  });
  const metrics = [...new Set(parsed.map((row) => row.metric).filter(Boolean))];
  const chosen = pickMetric(metrics, parsed);
  const focused = chosen
    ? parsed.filter((row) => row.metric === chosen)
    : parsed;
  const stripName = Boolean(chosen) || metrics.length === 1;
  const stripped = focused.map((row) => ({
    x: typeof row.x === 'number' ? row.x : stripName ? row.name : String(row.x),
    y: row.y,
  }));
  const series = looksLikeSeries(stripped.map((row) => String(row.x)));
  const capped = series ? stripped.slice(0, 24) : stripped.slice(0, NAMED_CAP);
  return {
    rows: capped,
    xLabel: chosen ? xLabel.replace(/\s*[&+/|,]\s*metric.*$/i, '').trim() || 'Name' : xLabel,
    yLabel: chosen ? labelForMetric(chosen, yLabel) : yLabel,
  };
}

function pickMetric(
  metrics: string[],
  rows: Array<{ metric: string }>
): string {
  if (metrics.length === 0) {
    return '';
  }
  if (metrics.length === 1) {
    return metrics[0] ?? '';
  }
  const preferred = metrics.filter((metric) => !/rank/i.test(metric));
  const pool = preferred.length > 0 ? preferred : metrics;
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.metric || !pool.includes(row.metric)) {
      continue;
    }
    counts.set(row.metric, (counts.get(row.metric) ?? 0) + 1);
  }
  return [...pool].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0] ?? '';
}

function labelForMetric(metric: string, fallback: string): string {
  if (/rank/i.test(metric)) {
    return 'Rank';
  }
  if (/%/.test(metric) || /usage|share|survey/i.test(metric)) {
    return /work/i.test(metric) ? 'Work %' : 'Usage %';
  }
  return fallback === 'Score' || fallback === 'Value' ? metric : fallback;
}

function looksLikeSeries(names: string[]): boolean {
  if (names.length < 8) {
    return false;
  }
  const hits = names.filter((name) => {
    const n = name.trim();
    return (
      /^20\d{2}(?:\s*[-–/]\s*(?:\d{2}|20\d{2}))?$/.test(n) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(n) ||
      /^w(?:eek)?\s*\d+$/i.test(n) ||
      /^\d{4}$/.test(n)
    );
  }).length;
  return hits >= names.length * 0.7;
}

function fallbackXLabel(type: 'bar' | 'line' | 'scatter'): string {
  if (type === 'line') {
    return 'Time';
  }
  if (type === 'scatter') {
    return 'X';
  }
  return 'Category';
}
