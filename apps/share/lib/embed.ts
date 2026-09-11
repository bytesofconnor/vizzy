import { CARDS, type CardSize } from './compose';
import type { Piece } from './pieces';

export function pieceImagePath(slug: string, size: CardSize = 'md'): string {
  return size === 'md' ? `/c/${slug}.png` : `/c/${slug}/png?size=${size}`;
}

export function markdownEmbed(
  origin: string,
  piece: Pick<Piece, 'slug' | 'title'>,
  size: CardSize = 'md'
): string {
  return `![${piece.title}](${origin}${pieceImagePath(piece.slug, size)})`;
}

export function htmlEmbed(
  origin: string,
  piece: Pick<Piece, 'slug' | 'title' | 'note'> & { source?: string },
  size: CardSize = 'md'
): string {
  const src = `${origin}${pieceImagePath(piece.slug, size)}`;
  const caption = piece.source ? `${piece.note} ${piece.source}` : piece.note;
  return `<figure style="max-width:100%;margin:0">\n  <img src="${src}" alt="${piece.title}" width="${CARDS[size].width}" style="display:block;width:100%;height:auto" />\n  <figcaption>${caption}</figcaption>\n</figure>`;
}
