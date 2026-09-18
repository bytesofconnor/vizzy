import type { Piece } from './pieces';

/** A follow-on prompt that cites this chart so someone can ask the next public cut. */
export function remixPrompt(piece: Pick<Piece, 'slug' | 'title' | 'note' | 'config'>, origin: string): string {
  const url = `${origin.replace(/\/$/, '')}/c/${piece.slug}`;
  const source = piece.config.source;
  const sourceBit = source
    ? `Source: ${source.label}${source.method === 'official' ? ' (official)' : ` (${source.method})`}`
    : 'Source: not specified. Do not invent one.';
  const note = piece.note.trim() ? `What it shows: ${piece.note.trim()}` : null;
  return [
    'Start from this chart and ask a sharper public question. Keep published numbers. Do not invent a source.',
    '',
    piece.title,
    url,
    sourceBit,
    note,
    '',
    'The next cut I want:',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function remixFollowUp(prompt: string): string | null {
  const parts = prompt.split(/The next cut I want:\s*/i);
  if (parts.length >= 2) {
    return (parts[1] ?? '').trim();
  }
  if (/^Start from this chart and ask/i.test(prompt.trim())) {
    return '';
  }
  return null;
}

const INSTRUCTION_START =
  /^(add|ask|bring|change|colour|color|compare|cut|draw|drop|filter|focus|give|hide|include|keep|label|look up|make|move|plot|put|remove|replace|revise|show|sort|start|switch|take|try|turn|update|use|widen)\b/i;

/** True when the string is a revise command, not a name for the figure. */
export function looksLikeInstruction(text: string): boolean {
  const line = text.trim().replace(/\s+/g, ' ');
  if (!line) {
    return false;
  }
  if (/^Start from this chart and ask/i.test(line)) {
    return true;
  }
  if (/\bthe missing comparison\b/i.test(line) || /\bthat would change how\b/i.test(line)) {
    return true;
  }
  return INSTRUCTION_START.test(line);
}

export function displayChartTitle(title: string, fallback?: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (/^Start from this chart and ask/i.test(trimmed) || looksLikeInstruction(trimmed)) {
    const note = (fallback ?? '').trim().replace(/\s+/g, ' ');
    if (note.length >= 12 && !looksLikeInstruction(note)) {
      return note.length > 90 ? `${note.slice(0, 87).trim()}…` : note;
    }
    return 'A remix';
  }
  return title.trim();
}

export function chartTitleFromAsk(asked: string): string {
  const follow = remixFollowUp(asked);
  const line = (follow === null ? asked : follow).split('\n')[0]?.trim() ?? '';
  const cleaned = line.replace(/\s+/g, ' ');
  if (cleaned.length >= 8 && !looksLikeInstruction(cleaned)) {
    return cleaned.slice(0, 160);
  }
  return 'A remix';
}

/** Name the figure. Honor the prompt for data; never paste a command into the title. */
export function titleForChart(input: { drafted: string; asked: string; previous?: string }): string {
  const drafted = displayChartTitle(input.drafted);
  const previous = input.previous?.trim();
  if (previous && (looksLikeInstruction(input.drafted) || looksLikeInstruction(drafted))) {
    return previous;
  }
  if (previous && titlesCopyTheAsk(input.drafted, input.asked) && looksLikeInstruction(input.asked)) {
    return previous;
  }
  if (drafted !== 'A remix' && !looksLikeInstruction(drafted)) {
    return drafted;
  }
  const fromAsk = chartTitleFromAsk(input.asked);
  if (fromAsk !== 'A remix') {
    return fromAsk;
  }
  return previous || 'Chart';
}

function titlesCopyTheAsk(drafted: string, asked: string): boolean {
  const a = drafted.trim().toLowerCase().replace(/\s+/g, ' ');
  const b = (remixFollowUp(asked) ?? asked).split('\n')[0]?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  if (a.length < 8 || b.length < 8) {
    return false;
  }
  return a === b || a.startsWith(b.slice(0, 48)) || b.startsWith(a.slice(0, 48));
}
