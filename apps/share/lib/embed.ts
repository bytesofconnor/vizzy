import { CARDS, type CardSize } from './compose';
import type { Piece } from './pieces';

export function pieceImagePath(slug: string, size: CardSize = 'md'): string {
  return size === 'md' ? `/c/${slug}.png` : `/c/${slug}/png?size=${size}`;
}

export function markdownEmbed(
  origin: string,
  piece: Pick<Piece, 'slug' | 'title'>,
  size: CardSize = 'md',
  insight?: string
): string {
  const image = `![${piece.title}](${origin}${pieceImagePath(piece.slug, size)})`;
  if (!insight?.trim()) {
    return image;
  }
  return `${image}\n\n${insight.trim()}`;
}

export function htmlEmbed(
  origin: string,
  piece: Pick<Piece, 'slug' | 'title' | 'note'> & { source?: string },
  size: CardSize = 'md',
  insight?: string
): string {
  const src = `${origin}${pieceImagePath(piece.slug, size)}`;
  const caption = piece.source ? `${piece.note} ${piece.source}` : piece.note;
  const insightBlock = insight?.trim()
    ? insight
        .trim()
        .split(/\n\s*\n/)
        .map(
          (paragraph) =>
            `\n  <p style="margin:12px 0 0;font:14px/1.5 ui-monospace,monospace;color:#534f48">${escapeHtml(paragraph.trim())}</p>`
        )
        .join('')
    : '';
  return `<figure style="max-width:100%;margin:0">\n  <img src="${src}" alt="${piece.title}" width="${CARDS[size].width}" style="display:block;width:100%;height:auto" />\n  <figcaption>${escapeHtml(caption)}</figcaption>${insightBlock}\n</figure>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
