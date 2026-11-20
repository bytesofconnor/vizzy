const COMPOSITION = /\bby\s+(?:the\s+)?(?:source|sources|sector|sectors|fuel|fuels)\b/i;

export function wantsComposition(asked: string): boolean {
  return COMPOSITION.test(asked);
}

type ShareRow = { x: string; y: number };

export function compositionRows(asked: string, notes: string, draft: ShareRow[]): ShareRow[] {
  const fromNotes = tableShares(notes);
  if (!wantsComposition(asked) || !fromNotes) {
    return draft;
  }
  if (fromNotes.length > draft.length && nearHundred(sum(fromNotes))) {
    return fromNotes;
  }
  if (!nearHundred(sum(draft)) && nearHundred(sum(fromNotes))) {
    return fromNotes;
  }
  return draft;
}

function tableShares(notes: string): ShareRow[] | null {
  let best: ShareRow[] | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const table of tables(notes)) {
    const rows = shareColumn(table);
    if (!rows || rows.length < 4) {
      continue;
    }
    const distance = Math.abs(sum(rows) - 100);
    if (distance < bestDistance) {
      best = rows;
      bestDistance = distance;
    }
  }
  if (!best || bestDistance > 20) {
    return null;
  }
  return best;
}

function tables(notes: string): string[][][] {
  const found: string[][][] = [];
  let current: string[][] = [];
  const flush = () => {
    if (current.length >= 2) {
      found.push(current);
    }
    current = [];
  };
  for (const line of notes.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^[-|:.\s]+$/.test(trimmed)) {
      continue;
    }
    if (trimmed.includes('|')) {
      current.push(
        trimmed
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean)
      );
      continue;
    }
    if (current.length > 0) {
      flush();
    }
  }
  flush();
  return found;
}

function shareColumn(table: string[][]): ShareRow[] | null {
  const header = table[0] ?? [];
  const body = table.slice(1).filter((row) => !isTotal(row[0] ?? ''));
  let best: ShareRow[] | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < header.length; index += 1) {
    const rows: ShareRow[] = [];
    for (const line of body) {
      const name = clean(line[0] ?? '');
      const value = numberIn(line[index] ?? '');
      if (!name || value === undefined || value < 0 || value > 100) {
        continue;
      }
      rows.push({ x: name, y: value });
    }
    if (rows.length < 4) {
      continue;
    }
    const distance = Math.abs(sum(rows) - 100);
    if (distance < bestDistance) {
      best = rows;
      bestDistance = distance;
    }
  }
  return best;
}

function isTotal(name: string): boolean {
  return /^(total|all sources|all sectors|generation)$/i.test(name.trim());
}

function clean(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
}

function numberIn(cell: string): number | undefined {
  const match = cell.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return undefined;
  }
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

function sum(rows: ShareRow[]): number {
  return rows.reduce((total, row) => total + row.y, 0);
}

function nearHundred(total: number): boolean {
  return total >= 80 && total <= 110;
}

export function numericAside(metric: string): boolean {
  return /^[-+]?\d+(?:\.\d+)?%?$/.test(metric.trim());
}
