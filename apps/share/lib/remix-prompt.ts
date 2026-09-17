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

export function displayChartTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (/^Start from this chart and ask/i.test(trimmed)) {
    return 'A remix';
  }
  return title.trim();
}

export function chartTitleFromAsk(asked: string): string {
  const follow = remixFollowUp(asked);
  const line = (follow || '').split('\n')[0]?.trim() ?? '';
  if (line.length >= 8) {
    return line.slice(0, 160);
  }
  return 'A remix';
}
