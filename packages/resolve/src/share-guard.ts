export type ShareGuardRow = {
  x: string | number;
  y: number | null;
  series?: string | null;
};

export type ShareGuardResult =
  | { ok: true; rows: ShareGuardRow[] }
  | { ok: false; error: string };

const PART_OF_WHOLE =
  /\b(?:by\s+(?:the\s+)?(?:source|sources|sector|sectors|fuel|fuels)|breakdown|energy mix|generation mix|share of (?:the )?total|percent of (?:the )?total)\b/i;

const SUBTOTAL = /\b(?:totals?|overall)\b|^(?:all|all sources|all sectors|all fuels)\b/i;

export function guardShareBreakdown(
  rows: ShareGuardRow[],
  context: { asked: string; yLabel?: string }
): ShareGuardResult {
  if (!isPartOfWhole(rows, context)) {
    return { ok: true, rows };
  }
  const parts = rows.filter((row) => !isSubtotalName(rowLabel(row)));
  if (parts.length === 0) {
    return { ok: false, error: 'Those rows are totals, not the parts of the mix.' };
  }
  const values = parts
    .map((row) => row.y)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length < 2) {
    return { ok: false, error: 'That mix does not have enough parts to chart.' };
  }
  const total = Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10;
  if (total < 95 || total > 105) {
    return {
      ok: false,
      error: `Those shares add to ${formatShare(total)}%, which is not a complete mix, so the chart was not drawn.`,
    };
  }
  return { ok: true, rows: parts };
}

function isPartOfWhole(rows: ShareGuardRow[], context: { asked: string; yLabel?: string }): boolean {
  if (rows.length < 2 || isYearSeries(rows)) {
    return false;
  }
  const values = rows
    .map((row) => row.y)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length < 2 || values.some((value) => value < 0 || value > 100)) {
    return false;
  }
  if (PART_OF_WHOLE.test(`${context.asked} ${context.yLabel ?? ''}`)) {
    return true;
  }
  return rows.some((row) => isSubtotalName(rowLabel(row)));
}

function isYearSeries(rows: ShareGuardRow[]): boolean {
  const timed = rows.filter((row) => /^(?:19|20)\d{2}(?:\b|[-/])/.test(String(row.x).trim())).length;
  return timed >= Math.ceil(rows.length * 0.7);
}

function rowLabel(row: ShareGuardRow): string {
  return String(row.series || row.x);
}

function isSubtotalName(name: string): boolean {
  return SUBTOTAL.test(name.trim());
}

function formatShare(total: number): string {
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}
