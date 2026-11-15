import type { Piece } from './pieces';
import { displayChartTitle, remixPrompt } from './remix-prompt';
import { DUST_MID, STUDIO } from './theme';

export const SHARE_MARK_LABEL = 'Made with Vizzy';
export const SHARE_CTA_LABEL = 'Make your own';
export const SHARE_PREVIEW_WIDTH = 1200;
export const SHARE_PREVIEW_HEIGHT = 630;

export type WriterPlan = 'free' | 'paid';

export type ShareBrandFlag = {
  plan?: WriterPlan;
  hideMark?: boolean;
};

export type SharePreviewCard = {
  title: string;
  source: string;
};

export type ShareChannel = {
  showMark: boolean;
  href: string;
  absoluteHref: string;
  prompt: string;
  ref: 'share';
  chart: string;
  preview: SharePreviewCard;
};

export function brandVisible(flag: ShareBrandFlag = {}): boolean {
  return !(flag.plan === 'paid' && flag.hideMark === true);
}

export function shareChannel(
  piece: Pick<Piece, 'slug' | 'title' | 'note' | 'config'>,
  options: { origin: string } & ShareBrandFlag
): ShareChannel {
  const origin = options.origin.replace(/\/$/, '');
  const prompt = remixPrompt(piece, origin);
  const url = new URL(`${origin}/`);
  url.searchParams.set('ref', 'share');
  url.searchParams.set('chart', piece.slug);
  url.searchParams.set('prompt', prompt);
  const source = piece.config.source;
  const sourceLabel = source?.label?.trim();
  return {
    showMark: brandVisible(options),
    href: `${url.pathname}${url.search}`,
    absoluteHref: url.toString(),
    prompt,
    ref: 'share',
    chart: piece.slug,
    preview: {
      title: displayChartTitle(piece.title, piece.note),
      source: sourceLabel
        ? source?.method === 'official'
          ? `${sourceLabel} · official`
          : sourceLabel
        : 'Source not specified',
    },
  };
}

export function sharePreviewPath(slug: string): string {
  return `/c/${slug}/opengraph-image`;
}

export function shareSocialImages(slug: string): {
  openGraph: { images: Array<{ url: string; width: number; height: number }> };
  twitter: { card: 'summary_large_image'; images: string[] };
} {
  const url = sharePreviewPath(slug);
  return {
    openGraph: {
      images: [{ url, width: SHARE_PREVIEW_WIDTH, height: SHARE_PREVIEW_HEIGHT }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [url],
    },
  };
}

export function shareLandingPrompt(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const prompt = raw.trim();
  if (prompt.length < 3 || prompt.length > 4000) {
    return undefined;
  }
  return prompt;
}

export function shareMarkHtml(channel: ShareChannel): string {
  if (!channel.showMark) {
    return '';
  }
  const href = escapeHtml(channel.absoluteHref);
  return `<p class="vizzy-share-mark" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:10px 0 0;font:11px/1.4 ui-monospace,SFMono-Regular,monospace;color:${STUDIO.mute}"><span style="display:inline-flex;align-items:center;gap:6px">${markBars()}<span>${SHARE_MARK_LABEL}</span></span><a href="${href}" style="color:${STUDIO.ink};text-decoration:none;border-bottom:1px solid rgba(18,18,17,0.28)">${SHARE_CTA_LABEL}</a></p>`;
}

function markBars(): string {
  const mid = DUST_MID[1];
  const cool = DUST_MID[5];
  return `<svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" style="display:block"><rect x="0" y="7" width="3" height="5" fill="${mid}"/><rect x="5" y="4" width="3" height="8" fill="${cool}"/><rect x="10" y="0" width="3" height="12" fill="${STUDIO.ink}"/></svg>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
