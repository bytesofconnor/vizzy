const US_STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
] as const;

const STATE_KEYS = new Set(US_STATE_NAMES.map((name) => name.toLowerCase()));
const NAMES_BY_LENGTH = [...US_STATE_NAMES].sort((a, b) => b.length - a.length);

function rowLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mentionsMissingState(sentence: string, plotted: Set<string>): boolean {
  const lower = sentence.toLowerCase();
  let cursor = 0;
  while (cursor < lower.length) {
    let found: { name: string; index: number } | null = null;
    for (const name of NAMES_BY_LENGTH) {
      const key = name.toLowerCase();
      const index = lower.indexOf(key, cursor);
      if (index < 0) {
        continue;
      }
      const before = index === 0 || !/[a-z]/.test(lower[index - 1] ?? '');
      const after = index + key.length >= lower.length || !/[a-z]/.test(lower[index + key.length] ?? '');
      if (!before || !after) {
        continue;
      }
      if (!found || index < found.index || (index === found.index && key.length > found.name.length)) {
        found = { name: key, index };
      }
    }
    if (!found) {
      return false;
    }
    if (!plotted.has(found.name)) {
      return true;
    }
    cursor = found.index + found.name.length;
  }
  return false;
}

function rewriteStateCount(text: string, stateRows: number): string {
  return text.replace(/\b(\d+)\s+((?:U\.S\. |US |United States )?)states\b/gi, (full, num, prefix) => {
    const count = Number(num);
    if (!Number.isFinite(count) || count === stateRows) {
      return full;
    }
    return `${stateRows} ${prefix}states`;
  });
}

export function alignPlottedClaims(text: string, rows: Array<{ x: string | number }>): string {
  const plotted = new Set(rows.map((row) => rowLabel(String(row.x))));
  const stateRows = [...plotted].filter((name) => STATE_KEYS.has(name)).length;
  if (stateRows < 2) {
    return text;
  }
  const paragraphs = text.split(/\n\s*\n/);
  const next = paragraphs
    .map((paragraph) => {
      const counted = rewriteStateCount(paragraph, stateRows);
      const sentences = counted.split(/(?<=[.!?])\s+/).filter((sentence) => !mentionsMissingState(sentence, plotted));
      return sentences.join(' ').replace(/[ \t]{2,}/g, ' ').trim();
    })
    .filter((paragraph) => paragraph.length > 0);
  return next.join('\n\n');
}
