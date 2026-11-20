import { labelIsPlace, placesInAsked } from './places';

export type AnswerCode = 'metric' | 'entity' | 'series' | 'composition' | 'units';

export type ChartFace = {
  title: string;
  chartType: 'bar' | 'line' | 'scatter';
  xLabel: string;
  yLabel: string;
  sourceLabel: string;
  seriesId?: string;
  rows: Array<{ x: string | number; y: number | null; series?: string }>;
};

export type AnswerCheck =
  | { ok: true }
  | { ok: false; code: AnswerCode; detail: string; honestTitle: string };

const STOP = new Set([
  'since',
  'from',
  'with',
  'that',
  'this',
  'over',
  'last',
  'past',
  'than',
  'into',
  'rate',
  'rates',
  'share',
  'total',
  'chart',
  'year',
  'years',
]);

const RATIO_ASK = /\bratio\b|price-to-income|price to income|to-income|times income/i;
const COMPOSITION_ASK = /\bby\s+(?:the\s+)?(?:source|sources|sector|sectors|fuel|fuels)\b/i;
const LEVEL_PRICE = /MSPUS|median sales price|median home price|median house price|sales price of houses/i;

export function titleClaimsMissing(title: string, detail: string): boolean {
  const named = detail.replace(/^Missing\s+/i, '').replace(/\.$/, '');
  const parts = named
    .split(/,\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  const folded = title.toLowerCase();
  return parts.some((part) => folded.includes(part.toLowerCase()));
}

export function checkAnswer(asked: string, face: ChartFace): AnswerCheck {
  const ratio = RATIO_ASK.test(asked);
  if (ratio && priceLevel(face)) {
    return {
      ok: false,
      code: 'metric',
      detail: 'That asks for a ratio. The series on hand is a price level, so it is not published under a ratio title.',
      honestTitle: levelTitle(face),
    };
  }

  const entities = placesInAsked(asked);
  if (entities.length >= 2) {
    const missing = entities.filter((entity) => !entityOnRow(entity, face));
    if (missing.length > 0) {
      const shown = entities.filter((entity) => !missing.includes(entity));
      return {
        ok: false,
        code: 'entity',
        detail: `Missing ${listNames(missing)}.`,
        honestTitle: entityTitle(shown, missing),
      };
    }
  }

  const parts = seriesParts(asked);
  if (parts.length === 2) {
    const missing = parts.filter((part) => !partShown(part, face));
    if (missing.length > 0) {
      const shown = parts.filter((part) => partShown(part, face));
      const focus = shown[0] ?? face.yLabel;
      return {
        ok: false,
        code: 'series',
        detail: `Missing ${listNames(missing)}.`,
        honestTitle: `${focus}. Not shown: ${listNames(missing)}.`,
      };
    }
  }

  if (COMPOSITION_ASK.test(asked) && shareSum(face.rows) === 'short') {
    const names = face.rows.map((row) => String(row.x)).filter(Boolean);
    return {
      ok: false,
      code: 'composition',
      detail: `The ${names.join(', ')} rows are only part of the mix, and the shares do not add to about 100%.`,
      honestTitle: names.length > 0 ? `Partial mix: ${listNames(names)}` : 'Partial mix',
    };
  }

  if (face.chartType !== 'scatter' && incompatibleAxes(asked)) {
    return {
      ok: false,
      code: 'units',
      detail: 'Those series use different units, so they do not share one axis.',
      honestTitle: face.yLabel || face.title,
    };
  }

  return { ok: true };
}

function priceLevel(face: ChartFace): boolean {
  const blob = `${face.title}\n${face.yLabel}\n${face.sourceLabel}\n${face.seriesId ?? ''}`;
  if (LEVEL_PRICE.test(blob)) {
    return true;
  }
  const values = face.rows.map((row) => row.y).filter((value): value is number => typeof value === 'number');
  if (values.length === 0) {
    return false;
  }
  const label = `${face.yLabel} ${face.title}`;
  return /\b(price|\$|usd|dollar)/i.test(label) && values.every((value) => value >= 1000);
}

function levelTitle(face: ChartFace): string {
  if (/median sales price/i.test(face.sourceLabel) || /MSPUS/.test(face.seriesId ?? '')) {
    return 'US median sales price of houses sold';
  }
  return face.yLabel || 'Price level';
}

function entityOnRow(entity: string, face: ChartFace): boolean {
  return face.rows.some((row) => labelIsPlace(String(row.series || row.x), entity));
}

const INSTRUCTION = /^(?:start|ask|keep|invent|show|draw|make|plot|give|tell|use|please|do|dont|don't)\b/i;

function seriesParts(asked: string): string[] {
  const line = (asked.split('\n')[0] ?? '').replace(/[?.!]+$/g, '').trim();
  if (/[.?!]/.test(line)) {
    return [];
  }
  const chunks = line
    .split(/\s+(?:and|vs\.?|versus)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (chunks.length !== 2 || chunks.some((part) => part.length > 48 || INSTRUCTION.test(part))) {
    return [];
  }
  const substantive = chunks.filter((part) => tokens(part).length > 0 && placesInAsked(part).length === 0);
  return substantive.length === 2 ? substantive : [];
}

function tokens(part: string): string[] {
  return part
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP.has(token) && !/^(?:19|20)\d{2}$/.test(token));
}

function partShown(part: string, face: ChartFace): boolean {
  const blob = [
    face.title,
    face.xLabel,
    face.yLabel,
    face.sourceLabel,
    face.seriesId ?? '',
    ...face.rows.map((row) => `${row.series ?? ''} ${row.x}`),
  ]
    .join(' ')
    .toLowerCase();
  const wanted = tokens(part);
  if (wanted.length === 0) {
    return true;
  }
  const hits = wanted.filter((token) => blob.includes(token));
  return hits.length >= Math.min(wanted.length, 1) && hits.length >= Math.ceil(wanted.length / 2);
}

function shareSum(rows: ChartFace['rows']): 'short' | 'ok' | 'skip' {
  const values = rows.map((row) => row.y).filter((value): value is number => typeof value === 'number' && value >= 0);
  if (values.length === 0 || values.some((value) => value > 100)) {
    return 'skip';
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total >= 80 && total <= 110) {
    return 'ok';
  }
  if (total < 80) {
    return 'short';
  }
  return 'skip';
}

function incompatibleAxes(asked: string): boolean {
  const chunks = asked
    .split(/\s+(?:and|vs\.?|versus)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (chunks.length !== 2) {
    return false;
  }
  const left = measureFamily(chunks[0] ?? '');
  const right = measureFamily(chunks[1] ?? '');
  return left !== undefined && right !== undefined && left !== right;
}

function measureFamily(text: string): 'years' | 'money' | 'percent' | undefined {
  const folded = text.toLowerCase();
  if (/yield|inflation|unemployment|percent|\brate\b|\bshare\b/.test(folded)) {
    return 'percent';
  }
  if (/life expectancy/.test(folded)) {
    return 'years';
  }
  if (/gdp|per capita|per person|price|debt|\busd\b|dollar/.test(folded)) {
    return 'money';
  }
  return undefined;
}

function entityTitle(shown: string[], missing: string[]): string {
  if (shown.length === 0) {
    return `Not shown: ${listNames(missing)}.`;
  }
  return `Showing ${listNames(shown)}. Not shown: ${listNames(missing)}.`;
}

function listNames(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
