const MONTH: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function timeKey(label: string): number | null {
  const text = label.trim();
  const iso = text.match(/^((?:19|20)\d{2})-(\d{2})(?:-\d{2})?$/);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) {
      return Number(iso[1]) * 12 + month;
    }
  }
  const year = text.match(/^((?:19|20)\d{2})$/);
  if (year) {
    return Number(year[1]) * 12;
  }
  const named = text.match(/^([A-Za-z]+)\s+((?:19|20)\d{2})$/);
  if (!named) {
    return null;
  }
  const month = MONTH[named[1]!.slice(0, 3).toLowerCase()];
  if (!month) {
    return null;
  }
  return Number(named[2]) * 12 + month;
}

export function contiguousRuns<T>(values: T[], label: (value: T) => string): T[][] {
  if (values.length === 0) {
    return [];
  }
  const keys = values.map((value) => timeKey(label(value)));
  if (keys.some((key) => key === null)) {
    return [values];
  }
  const gaps: number[] = [];
  for (let index = 1; index < keys.length; index += 1) {
    const gap = (keys[index] as number) - (keys[index - 1] as number);
    if (gap > 0) {
      gaps.push(gap);
    }
  }
  if (gaps.length === 0) {
    return [values];
  }
  const cadence = modalGap(gaps);
  const runs: T[][] = [[values[0]!]];
  for (let index = 1; index < values.length; index += 1) {
    const gap = (keys[index] as number) - (keys[index - 1] as number);
    const run = runs[runs.length - 1]!;
    if (gap > cadence) {
      runs.push([values[index]!]);
    } else {
      run.push(values[index]!);
    }
  }
  return runs;
}

function modalGap(gaps: number[]): number {
  const counts = new Map<number, number>();
  for (const gap of gaps) {
    counts.set(gap, (counts.get(gap) ?? 0) + 1);
  }
  let best = gaps[0]!;
  let bestCount = 0;
  for (const [gap, count] of counts) {
    if (count > bestCount || (count === bestCount && gap < best)) {
      best = gap;
      bestCount = count;
    }
  }
  return best;
}
