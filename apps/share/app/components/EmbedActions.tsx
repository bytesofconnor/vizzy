'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CARD_SIZES, type CardSize } from '../../lib/compose';
import { DUST } from '../../lib/theme';
import { htmlEmbed, markdownEmbed, pieceImagePath } from '../../lib/embed';

type Mode = 'image' | 'markdown' | 'html' | null;

const SIZE_LABEL: Record<CardSize, string> = {
  sm: 'S',
  md: 'M',
  lg: 'L',
};

const SIZE_HINT: Record<CardSize, string> = {
  sm: 'Phone, Slack',
  md: 'Blog, Notion',
  lg: 'Deck, hero',
};

const COPY_ACTIONS = [
  {
    mode: 'image' as const,
    label: 'PNG',
    hint: 'To clipboard',
    run: 'copyImage' as const,
    Icon: IconImage,
  },
  {
    mode: 'markdown' as const,
    label: 'Markdown',
    hint: 'Image + link',
    run: 'copyMarkdown' as const,
    Icon: IconMarkdown,
  },
  {
    mode: 'html' as const,
    label: 'HTML',
    hint: 'Img + caption',
    run: 'copyHtml' as const,
    Icon: IconHtml,
  },
];

export function EmbedActions({
  slug,
  title,
  note,
  source,
  insight,
}: {
  slug: string;
  title: string;
  note: string;
  source?: string;
  insight?: string | null;
}) {
  const [size, setSize] = useState<CardSize>('md');
  const [includeInsight, setIncludeInsight] = useState(Boolean(insight));
  const [copied, setCopied] = useState<Mode>(null);
  const [busy, setBusy] = useState<Mode>(null);
  const [fail, setFail] = useState<Mode>(null);
  const exportInsight = includeInsight && insight ? insight : undefined;
  const sizeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (insight) {
      setIncludeInsight(true);
    }
  }, [insight]);

  function mark(mode: Mode) {
    setCopied(mode);
    setFail(null);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function markFail(mode: Mode) {
    setFail(mode);
    window.setTimeout(() => setFail(null), 2200);
  }

  async function copyImage() {
    let blob: Blob;
    if (exportInsight) {
      const response = await fetch('/api/export/png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, size, insight: exportInsight }),
      });
      if (!response.ok) {
        throw new Error('export failed');
      }
      blob = await response.blob();
    } else {
      const url = new URL(pieceImagePath(slug, size), window.location.origin).toString();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('image failed');
      }
      blob = await response.blob();
    }
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    mark('image');
  }

  async function copyMarkdown() {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(
      markdownEmbed(origin, { slug, title }, size, exportInsight)
    );
    mark('markdown');
  }

  async function copyHtml() {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(
      htmlEmbed(origin, { slug, title, note, source }, size, exportInsight)
    );
    mark('html');
  }

  function focusSize(index: number) {
    sizeRefs.current[index]?.focus();
  }

  function onSizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = CARD_SIZES.indexOf(size);
    if (current < 0) {
      return;
    }

    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % CARD_SIZES.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + CARD_SIZES.length) % CARD_SIZES.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = CARD_SIZES.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const option = CARD_SIZES[next];
    if (option) {
      setSize(option);
      focusSize(next);
    }
  }

  function onActionKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (index + 1) % COPY_ACTIONS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (index - 1 + COPY_ACTIONS.length) % COPY_ACTIONS.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = COPY_ACTIONS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    actionRefs.current[next]?.focus();
  }

  async function onCopy(run: (typeof COPY_ACTIONS)[number]['run'], mode: Mode) {
    if (busy) {
      return;
    }
    setBusy(mode);
    setFail(null);
    try {
      if (run === 'copyImage') {
        await copyImage();
      } else if (run === 'copyMarkdown') {
        await copyMarkdown();
      } else {
        await copyHtml();
      }
    } catch {
      markFail(mode);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="paste-menu" aria-label="Copy chart">
      <div className="paste-menu-section">
        <p className="paste-menu-kicker">Size</p>
        <div className="paste-size-row">
          <div
            className="paste-size-pills"
            role="radiogroup"
            aria-label="Export size"
            onKeyDown={onSizeKeyDown}
          >
            {CARD_SIZES.map((option, index) => {
              const active = size === option;
              const tone = DUST[index % DUST.length] ?? DUST[0];
              return (
                <button
                  key={option}
                  ref={(node) => {
                    sizeRefs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  className={active ? 'paste-size-pill is-active' : 'paste-size-pill'}
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  aria-label={`${SIZE_LABEL[option]}, ${SIZE_HINT[option]}`}
                  title={SIZE_HINT[option]}
                  style={({ ['--pill-tone' as string]: tone } as CSSProperties)}
                  onClick={() => {
                    setSize(option);
                    focusSize(index);
                  }}
                >
                  <span className="paste-size-letter">{SIZE_LABEL[option]}</span>
                </button>
              );
            })}
          </div>
          <p className="paste-size-hint">{SIZE_HINT[size]}</p>
        </div>
      </div>

      {insight ? (
        <div className="paste-menu-section paste-menu-insight">
          <label className="paste-insight-toggle">
            <input
              type="checkbox"
              checked={includeInsight}
              onChange={(event) => setIncludeInsight(event.target.checked)}
            />
            <span>Include context in exports</span>
          </label>
        </div>
      ) : null}

      <div className="paste-menu-section">
        <p className="paste-menu-kicker">Copy as</p>
        <div className="paste-actions" role="toolbar" aria-label="Copy format">
          {COPY_ACTIONS.map((action, index) => {
            const isCopied = copied === action.mode;
            const isBusy = busy === action.mode;
            const isFail = fail === action.mode;
            const Icon = isCopied ? IconCheck : action.Icon;
            const statusLabel = isFail
              ? 'Copy failed, try again'
              : isCopied
                ? 'Copied to clipboard'
                : `Copy as ${action.label}, ${action.hint}`;
            return (
              <button
                key={action.mode}
                ref={(node) => {
                  actionRefs.current[index] = node;
                }}
                type="button"
                className={[
                  'paste-action',
                  isCopied ? 'is-copied' : '',
                  isBusy ? 'is-busy' : '',
                  isFail ? 'is-fail' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={Boolean(busy)}
                aria-busy={isBusy}
                aria-label={statusLabel}
                onKeyDown={(event) => onActionKeyDown(event, index)}
                onClick={() => void onCopy(action.run, action.mode)}
              >
                <span className="paste-action-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="paste-action-copy">
                  <span className="paste-action-label">
                    {isFail ? 'Try again' : isCopied ? 'Copied' : action.label}
                  </span>
                  <span className="paste-action-hint">
                    {isFail ? 'Clipboard blocked' : isCopied ? 'Ready to paste' : action.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="paste-menu-live" aria-live="polite">
          {copied === 'image'
            ? 'PNG copied to clipboard.'
            : copied === 'markdown'
              ? 'Markdown copied to clipboard.'
              : copied === 'html'
                ? 'HTML copied to clipboard.'
                : ''}
        </p>
      </div>
    </div>
  );
}

function iconProps(className?: string) {
  return {
    className,
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true as const,
  };
}

function IconImage({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="10" r="1.25" fill="currentColor" />
      <path
        d="M3 16.5 8.5 11l3.5 3.5L15 11.5 21 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMarkdown({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="7.5"
        fontWeight="700"
        letterSpacing="-0.06em"
      >
        MD
      </text>
    </svg>
  );
}

function IconHtml({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="m8.5 8-3.5 4 3.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m15.5 8 3.5 4-3.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 7.5 11 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m8.2 12.2 2.3 2.3 5.3-5.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
