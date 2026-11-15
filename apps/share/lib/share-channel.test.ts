import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { htmlEmbed } from './embed';
import { pieceBySlug } from './pieces';
import { ShareMark } from './share-mark';
import { shareChannel, shareLandingPrompt } from './share-channel';

const ORIGIN = 'https://vizzy.run';

function reef() {
  const piece = pieceBySlug('reef');
  if (!piece) {
    throw new Error('reef fixture missing');
  }
  return piece;
}

describe('shared chart page', () => {
  it('renders the Make your own link with the remix and the share attribution', async () => {
    const piece = reef();
    const channel = shareChannel(piece, { origin: ORIGIN });
    const html = renderToStaticMarkup(createElement(ShareMark, { channel }));
    const page = await import('../app/c/[slug]/page');
    const rendered = renderToStaticMarkup(
      await page.default({ params: Promise.resolve({ slug: 'reef' }) })
    );

    expect(html).toContain('Made with Vizzy');
    expect(html).toContain('Make your own');

    const anchor = rendered.match(
      /<a href="(\/\?ref=share&amp;chart=reef&amp;prompt=[^"]*)">Make your own<\/a>/
    );
    expect(anchor).not.toBeNull();
    const landing = new URL(`https://vizzy.run${anchor?.[1].replace(/&amp;/g, '&')}`);
    expect(landing.searchParams.get('ref')).toBe('share');
    expect(landing.searchParams.get('chart')).toBe('reef');
    const prompt = landing.searchParams.get('prompt') ?? '';
    expect(prompt).toContain('Great Barrier Reef hard coral cover by sector');
    expect(prompt).toContain('https://vizzy.run/c/reef');
    expect(prompt).toContain('AIMS Long-Term Monitoring');
    expect(prompt).toContain('The next cut I want:');
    expect(channel.prompt).toBe(prompt);
  });

  it('keeps the mark on a free chart and drops it when a paid writer hides it', () => {
    const piece = reef();
    const branded = shareChannel(piece, { origin: ORIGIN, plan: 'free', hideMark: true });
    const plain = shareChannel(piece, { origin: ORIGIN, plan: 'paid', hideMark: true });
    expect(branded.showMark).toBe(true);
    expect(renderToStaticMarkup(createElement(ShareMark, { channel: branded }))).toContain('Made with Vizzy');
    expect(renderToStaticMarkup(createElement(ShareMark, { channel: plain }))).toBe('');
  });
});

describe('share landing', () => {
  it('prefills the composer from the remix query and ignores a blank prompt', async () => {
    expect(shareLandingPrompt('  ')).toBeUndefined();
    expect(shareLandingPrompt('ab')).toBeUndefined();
    const prompt = 'Start from the reef chart. The next cut I want: the south only';
    expect(shareLandingPrompt(`  ${prompt}  `)).toBe(prompt);
    const page = await import('../app/page');
    const html = renderToStaticMarkup(
      await page.default({ searchParams: Promise.resolve({ prompt }) })
    );
    expect(html).toContain(prompt);
  });
});

describe('embed', () => {
  it('renders the Made with Vizzy mark and the remix link', () => {
    const piece = reef();
    const html = htmlEmbed(ORIGIN, piece, 'md');
    expect(html).toContain('Made with Vizzy');
    expect(html).toContain('Make your own');
    expect(html).toContain('width:100%');
    expect(html).toContain('ref=share');
    expect(html).toContain('chart=reef');
    expect(html).toContain('https://vizzy.run/c/reef');
    const plain = htmlEmbed(ORIGIN, piece, 'md', undefined, { plan: 'paid', hideMark: true });
    expect(plain).not.toContain('Made with Vizzy');
  });
});

describe('share preview', () => {
  it('returns a PNG for a real chart', async () => {
    const image = await import('../app/c/[slug]/opengraph-image');
    const response = await image.default({ params: Promise.resolve({ slug: 'reef' }) });
    expect(response.headers.get('content-type')).toContain('image/png');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
    expect(bytes.byteLength).toBeGreaterThan(5000);
  }, 30000);
});
