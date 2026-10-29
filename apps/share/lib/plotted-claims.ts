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

function isYear(value: number): boolean {
  return Number.isInteger(value) && value >= 1800 && value <= 2100;
}

function formatLike(raw: string, value: number): string {
  const digits = Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
  if (raw.includes('%')) {
    return `${digits}%`;
  }
  if (raw.includes('$')) {
    return `$${digits}`;
  }
  return digits;
}

function alignMentionedValues(
  text: string,
  rows: Array<{ x: string | number; y?: number | null; series?: string }>
): string {
  const plotted = rows.filter((row): row is { x: string | number; y: number; series?: string } =>
    typeof row.y === 'number' && Number.isFinite(row.y)
  );
  if (plotted.length === 0) {
    return text;
  }
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      const mentioned = plotted.filter((row) => {
        const names = [String(row.x), row.series ?? ''].filter((name) => name.trim().length > 1);
        return names.some((name) => {
          const needle = name.toLowerCase();
          const hay = sentence.toLowerCase();
          const index = hay.indexOf(needle);
          if (index < 0) {
            return false;
          }
          const before = index === 0 || !/[a-z0-9]/.test(hay[index - 1] ?? '');
          const after = index + needle.length >= hay.length || !/[a-z0-9]/.test(hay[index + needle.length] ?? '');
          return before && after;
        });
      });
      const target = mentioned.length === 1 ? mentioned[0] : mentioned.length === 0 && plotted.length === 1 ? plotted[0] : undefined;
      if (!target) {
        return sentence;
      }
      const y = target.y;
      return sentence.replace(/\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$?\d+(?:\.\d+)?%?/g, (raw) => {
        const numeric = Number(raw.replace(/[$,%]/g, ''));
        if (!Number.isFinite(numeric) || numeric === y) {
          return raw;
        }
        if (plotted.some((row) => row.y === numeric)) {
          return raw;
        }
        if (!raw.includes('$') && !raw.includes('%') && isYear(numeric)) {
          return raw;
        }
        return formatLike(raw, y);
      });
    })
    .join(' ');
}

function dropSelfLead(text: string): string {
  return text.replace(
    /\b([\p{L}][\p{L}0-9.'’-]{0,48}?)\b leads\b([^.!?]{0,180}?) well ahead of \1\b/giu,
    '$1 leads$2'
  );
}

export function alignPlottedClaims(
  text: string,
  rows: Array<{ x: string | number; y?: number | null; series?: string }>
): string {
  const plotted = new Set(rows.map((row) => rowLabel(String(row.x))));
  const stateRows = [...plotted].filter((name) => STATE_KEYS.has(name)).length;
  let next = text;
  if (stateRows >= 2) {
    const paragraphs = text.split(/\n\s*\n/);
    next = paragraphs
      .map((paragraph) => {
        const counted = rewriteStateCount(paragraph, stateRows);
        const sentences = counted.split(/(?<=[.!?])\s+/).filter((sentence) => !mentionsMissingState(sentence, plotted));
        return sentences.join(' ').replace(/[ \t]{2,}/g, ' ').trim();
      })
      .filter((paragraph) => paragraph.length > 0)
      .join('\n\n');
  }
  return dropSelfLead(alignMentionedValues(next, rows));
}
