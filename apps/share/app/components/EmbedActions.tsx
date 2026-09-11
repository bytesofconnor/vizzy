'use client';

import { useState } from 'react';
import { CARD_SIZES, type CardSize } from '../../lib/compose';
import { htmlEmbed, markdownEmbed, pieceImagePath } from '../../lib/embed';

type Mode = 'image' | 'markdown' | 'html' | null;

const SIZE_LABEL: Record<CardSize, string> = {
  sm: 's',
  md: 'm',
  lg: 'l',
};

const SIZE_HINT: Record<CardSize, string> = {
  sm: 'Phone, Slack',
  md: 'Blog, Notion',
  lg: 'Deck, hero',
};

export function EmbedActions({
  slug,
  title,
  note,
  source,
}: {
  slug: string;
  title: string;
  note: string;
  source?: string;
}) {
  const [size, setSize] = useState<CardSize>('md');
  const [copied, setCopied] = useState<Mode>(null);

  function mark(mode: Mode) {
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function copyImage() {
    const url = new URL(pieceImagePath(slug, size), window.location.origin).toString();
    const item = new ClipboardItem({
      'image/png': fetch(url).then((response) => response.blob()),
    });
    await navigator.clipboard.write([item]);
    mark('image');
  }

  async function copyMarkdown() {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(markdownEmbed(origin, { slug, title }, size));
    mark('markdown');
  }

  async function copyHtml() {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(htmlEmbed(origin, { slug, title, note, source }, size));
    mark('html');
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '12px 20px',
        marginTop: 18,
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--mute)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Size
      </span>
      {CARD_SIZES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={size === option}
          aria-label={`${SIZE_LABEL[option]}, ${SIZE_HINT[option]}`}
          title={SIZE_HINT[option]}
          onClick={() => setSize(option)}
          style={{
            textDecoration: size === option ? 'underline' : 'none',
            color: size === option ? 'var(--ink)' : 'var(--mute)',
          }}
        >
          {SIZE_LABEL[option]}
        </button>
      ))}
      <span style={{ color: 'var(--mute)' }}>{SIZE_HINT[size]}</span>
      <span style={{ color: 'var(--rule)' }}>/</span>
      <button type="button" onClick={copyImage}>
        {copied === 'image' ? 'Copied image' : 'Copy image'}
      </button>
      <button type="button" onClick={copyMarkdown}>
        {copied === 'markdown' ? 'Copied markdown' : 'Copy markdown'}
      </button>
      <button type="button" onClick={copyHtml}>
        {copied === 'html' ? 'Copied HTML' : 'Copy HTML'}
      </button>
    </div>
  );
}
