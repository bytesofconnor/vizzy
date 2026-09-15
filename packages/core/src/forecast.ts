const MONTHS: Array<[string, number]> = [
  ['january', 0],
  ['february', 1],
  ['march', 2],
  ['april', 3],
  ['june', 5],
  ['july', 6],
  ['august', 7],
  ['september', 8],
  ['october', 9],
  ['november', 10],
  ['december', 11],
  ['sept', 8],
  ['jan', 0],
  ['feb', 1],
  ['mar', 2],
  ['apr', 3],
  ['may', 4],
  ['jun', 5],
  ['jul', 6],
  ['aug', 7],
  ['sep', 8],
  ['oct', 9],
  ['nov', 10],
  ['dec', 11],
];

type MonthTick = { year: number | null; month: number };

/** First row that is a forecast, or -1 if the series is all published. */
export function forecastStartIndex(
  rows: Array<Record<string, unknown>>,
  xField: string,
  forecastFrom?: string | number,
  now: Date = new Date()
): number {
  if (forecastFrom !== undefined && forecastFrom !== '') {
    const match = rows.findIndex((row) => String(row[xField]) === String(forecastFrom));
    return match >= 0 ? match : -1;
  }

  const ticks = rows.map((row) => parseMonthTick(row[xField]));
  if (ticks.filter(Boolean).length < 3) {
    return -1;
  }

  const year = ticks.find((tick) => tick?.year)?.year ?? now.getFullYear();
  const today = now.getFullYear() * 12 + now.getMonth();

  return ticks.findIndex((tick) => {
    if (!tick) {
      return false;
    }
    return (tick.year ?? year) * 12 + tick.month > today;
  });
}

function parseMonthTick(value: unknown): MonthTick | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const lower = raw.toLowerCase();
  const month = MONTHS.find(([name]) => lower.startsWith(name) || new RegExp(`\\b${name}\\b`).test(lower));
  if (!month) {
    return null;
  }

  const fullYear = raw.match(/20\d{2}/);
  const shortYear = raw.match(/(?:^|\D)(\d{2})(?:\D|$)/);
  let year: number | null = null;
  if (fullYear) {
    year = Number(fullYear[0]);
  } else if (shortYear?.[1] && Number(shortYear[1]) >= 20) {
    year = 2000 + Number(shortYear[1]);
  }

  return { year, month: month[1] };
}
