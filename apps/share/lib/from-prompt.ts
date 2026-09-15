import { generateText, Output } from 'ai';
import { z } from 'zod';
import { forecastStartIndex } from '@vizzy/core';
import { countedSeriesRows, gatherFacts } from './lookup';
import { mintPiece, type MintResult } from './mint';
import { followUpNeedsLookup, seedBriefing, type ChartSeed } from './seed';
import { firstPromptUrl, sourceLabelFor, sourceMethodFor } from './source';

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
    .max(24),
});

const SYSTEM = `You emit a Vizzy chart draft. Types: bar, line, scatter only. No pie.
Use the user's numbers when they paste a table.
If LOOKED-UP NOTES contain a real series, chart those numbers. Do not invent a different table.
Aim for about 15 rows on a ranking or named-category bar chart. A year by month is 12. A season is the published games so far. Do not pad past the natural series. Only take a top N when the user asked for one.
Only invent rows when the notes say lookup failed and the user pasted no numbers. Then sourceMethod must be estimate or example, and evidence must say so. Invent the natural complete series (12 months, a season), not three stub bars.
If the asked year is still in progress, later months are a forecast, not published fact. Say so in the note. sourceMethod must be estimate. Never attach Wikipedia or any URL to an estimate.
Always name xLabel and yLabel in words a reader can trust (Month, Wins, Points). Never leave them as x or y.
Never invent a source URL. Prefer the looked-up page title in sourceLabel.
y must be numeric. Keep titles short. Named categories cap around 15. Sequential series may be longer.
If y is a calendar year, keep it as the year. Do not convert it to a count from zero.
Keep category names short enough to sit under a bar: August Schell, not August Schell Brewing Company.
x is the name of each thing (skill, team, city). Never Rank 1, #3, or a place index. A top-10 chart still labels each bar with the name.
One comparison per chart. Each x value is one thing, once. Never "Claude Code (Rank)" and "Claude Code (usage %)". Pick one metric for y. Rank (lower is better) and a percentage (higher is better) must never share a chart.
If CURRENT CHART is in the prompt, this is a second pass on that chart. Keep those rows unless the follow-up asks to drop, add, sort, or change numbers. Honor the follow-up. Do not switch subjects. Keep the existing source unless new numbers were looked up.`;

/** Free-tier Gateway models. Full gpt-5.4 is paid-only and fails with a 403. */
const MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-4.1-mini',
] as const;

export function publicComposeError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/free tier|credits|upgrade|unauthorized|api key|gateway|rate limit|429|403/i.test(message)) {
    return 'Could not draw that. Try again in a moment.';
  }
  if (!message || message.length > 140) {
    return 'Could not draw that';
  }
  return message;
}

export async function pieceFromPrompt(prompt: string, from?: ChartSeed): Promise<MintResult> {
  const asked = prompt.trim();
  if (asked.length < 3) {
    return { ok: false, error: 'Say what to chart', issues: [] };
  }
  if (asked.length > 4000) {
    return { ok: false, error: 'Keep it under 4000 characters', issues: [] };
  }

  const lookup = !from || followUpNeedsLookup(asked);
  let gathered = { notes: '', urls: [] as string[] };
  if (lookup) {
    try {
      gathered = await gatherFacts(asked);
    } catch {
      gathered = { notes: '', urls: [] };
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

  let lastError: unknown;
  for (const model of MODELS) {
    try {
      let output = await draftChart(model, briefing);
      if (!output) {
        lastError = new Error('Could not draft a chart');
        continue;
      }

      const hinted = countedSeriesRows(gathered.notes);
      if (!from && output.rows.length < 8 && hinted >= 12) {
        const richer = await draftChart(
          model,
          `${briefing}\n\nThe first draft only used ${output.rows.length} rows. The notes have about ${hinted}. Emit about 15 rows from the notes. One name per row. One metric for y. Do not invent extras.`
        );
        if (richer && richer.rows.length > output.rows.length) {
          output = richer;
        }
      }
      if (mostlyRankIndex(output.rows)) {
        const named = await draftChart(
          model,
          `${briefing}\n\nThe first draft labeled bars Rank 1, Rank 2. That is not a chart. x must be the skill or item NAME from the notes. y is the score or count. Do not use Rank 1 as x.`
        );
        if (named && !mostlyRankIndex(named.rows)) {
          output = named;
        }
      }

      return mintDraft(asked, gathered, output, from);
    } catch (error) {
      lastError = error;
      console.error('compose draft failed', model, error);
      if (isRateLimited(error)) {
        break;
      }
    }
  }

  if (from) {
    return { ok: false, error: publicComposeError(lastError) || 'Could not revise that', issues: [] };
  }
  const fallback = estimateDraft(asked);
  if (!fallback) {
    return { ok: false, error: 'Could not find named figures to chart', issues: [] };
  }
  return mintDraft(asked, gathered, fallback);
}

async function draftChart(model: (typeof MODELS)[number], prompt: string) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: DraftSchema }),
    system: SYSTEM,
    prompt,
  });
  return output;
}

function mintDraft(
  asked: string,
  gathered: { notes: string; urls: string[] },
  output: z.infer<typeof DraftSchema>,
  from?: ChartSeed
): MintResult {
  const estimated = output.sourceMethod === 'estimate' || output.sourceMethod === 'example';
  const lookedUp = !estimated && gathered.urls.length > 0 && /\d/.test(gathered.notes);
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
  const tidied = tidyComparison(
    output.rows.map((row) => ({
      x: output.chartType === 'scatter' ? row.x : String(row.x),
      y: row.y,
    })),
    output.xLabel.trim() || fallbackXLabel(output.chartType),
    output.yLabel.trim() || 'Value'
  );
  const named = withNamedCategories(tidied.rows, gathered.notes, tidied.xLabel, asked);
  if (output.chartType !== 'scatter' && mostlyRankIndex(named.rows)) {
    return { ok: false, error: 'Could not find named figures to chart', issues: [] };
  }
  const xLabel = named.xLabel;
  const yLabel = tidied.yLabel;
  const rows = named.rows;
  const forecastAt = output.chartType === 'line' ? forecastStartIndex(rows, 'x') : -1;
  const forecastFrom = forecastAt >= 0 ? String(rows[forecastAt]?.x ?? '') : '';

  return mintPiece({
    title: output.title,
    kicker: estimated ? 'Estimate' : output.kicker,
    note: output.note,
    data: rows,
    source: {
      label: keepSource
        ? from!.sourceLabel
        : estimated
          ? 'Estimate'
          : sourceLabelFor(sourceUrl, output.sourceLabel),
      method: keepSource ? method : sourceMethodFor(sourceUrl, method),
      evidence: keepSource ? from!.evidence || output.evidence : output.evidence,
      url: sourceUrl,
    },
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
        y: { show: true, grid: true, label: yLabel.slice(0, 40) },
      },
    },
  });
}

function isRateLimited(error: unknown): boolean {
  return /rate limit|429|free tier|credits/i.test(error instanceof Error ? error.message : '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function estimateDraft(asked: string): z.infer<typeof DraftSchema> | null {
  if (!/month/i.test(asked)) {
    return null;
  }
  const year = asked.match(/20\d{2}/)?.[0];
  return {
    title: asked.replace(/\s+/g, ' ').trim().slice(0, 80),
    kicker: 'Estimate',
    note: year && Number(year) >= new Date().getFullYear()
      ? `${year} is not over. Months after now are a forecast, not a published series.`
      : 'No published series in time. These rows are an estimate.',
    chartType: 'line',
    area: true,
    xLabel: 'Month',
    yLabel: /%|percent|rate/i.test(asked) ? 'Rate %' : /satisfaction|score/i.test(asked) ? 'Score' : 'Value',
    sourceLabel: 'Estimate',
    sourceMethod: 'estimate',
    evidence: 'Lookup failed; estimated series',
    rows: MONTHS.map((month, index) => ({
      x: month,
      y: Math.round(64 + 7 * Math.sin(index / 2.2) + index * 0.35),
    })),
  };
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
      /^(skill|name|title|tool|item|package|repo|city|team|player|company)/i.test(cell)
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
      line.match(/^\d{1,2}[.)]\s+[*_]*([A-Za-z][^|(\[]{1,60}?)[*_]*\s*(?:[—–|:(-]|score|$)/i) ??
      line.match(/^[-*]\s+[*_\[]*([A-Za-z][^|\]]{1,60}?)[\]]*\s*(?:[—–|:(-]|$)/);
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
