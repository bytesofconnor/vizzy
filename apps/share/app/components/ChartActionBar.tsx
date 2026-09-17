'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Piece } from '../../lib/pieces';
import { remixPrompt } from '../../lib/remix-prompt';
import { sourceLine } from '../../lib/source';
import { ChartTipButton, useSpokenTip } from './ChartTipButton';
import { ExportMark, RemixMark, ShareMark } from './ChartMarks';
import { EmbedActions } from './EmbedActions';
import { PinButton } from './PinButton';
import { fillComposePrompt } from './TellMeMore';

export function ChartActionBar({ piece, insight }: { piece: Piece; insight: string | null }) {
  return (
    <div className="chart-actions">
      <ShareButton slug={piece.slug} title={piece.title} />
      <RemixButton piece={piece} />
      <ExportButton piece={piece} insight={insight} />
      <PinButton slug={piece.slug} title={piece.title} />
    </div>
  );
}

function ShareButton({ slug, title }: { slug: string; title: string }) {
  const { spoken, flash } = useSpokenTip();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(`/c/${slug}`, window.location.origin).toString();
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text: title, url });
        setCopied(false);
        flash();
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      flash();
    } catch {
      setCopied(false);
    }
  }

  const tip = spoken ? (copied ? 'Link copied' : 'Shared') : 'Share chart';

  return (
    <ChartTipButton label="Share chart" tip={tip} spoken={spoken} onClick={() => void share()}>
      <ShareMark on={spoken} />
    </ChartTipButton>
  );
}

function RemixButton({ piece }: { piece: Piece }) {
  const { spoken, flash } = useSpokenTip();

  function remix() {
    const prompt = remixPrompt(piece, window.location.origin);
    fillComposePrompt(prompt, true);
    const desk = document.getElementById('make-one') ?? document.getElementById('again');
    desk?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flash();
  }

  return (
    <ChartTipButton
      label="Remix this chart"
      tip={spoken ? 'Prompt ready — add your next question' : 'Remix this chart'}
      spoken={spoken}
      onClick={remix}
    >
      <RemixMark on={spoken} />
    </ChartTipButton>
  );
}

function ExportButton({ piece, insight }: { piece: Piece; insight: string | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const source = piece.config.source ? `Source: ${sourceLine(piece.config.source)}` : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function placeSheet() {
      const sheet = sheetRef.current;
      const trigger = triggerRef.current;
      if (!sheet || !trigger || window.matchMedia('(max-width: 719px)').matches) {
        sheet?.style.removeProperty('--export-top');
        sheet?.style.removeProperty('--export-left');
        sheet?.style.removeProperty('--export-width');
        sheet?.style.removeProperty('--export-max-height');
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const margin = 16;
      const gap = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(sheet.offsetWidth, 320), viewportWidth - margin * 2);
      let left = rect.right - width;
      left = Math.min(left, viewportWidth - margin - width);
      left = Math.max(margin, left);

      const spaceBelow = viewportHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const openDown = spaceBelow >= 280 || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(240, openDown ? spaceBelow : spaceAbove);
      const top = openDown
        ? rect.bottom + gap
        : Math.max(margin, rect.top - gap - maxHeight);

      sheet.style.setProperty('--export-top', `${Math.round(top)}px`);
      sheet.style.setProperty('--export-left', `${Math.round(left)}px`);
      sheet.style.setProperty('--export-width', `${Math.round(width)}px`);
      sheet.style.setProperty('--export-max-height', `${Math.round(maxHeight)}px`);
    }

    placeSheet();
    window.requestAnimationFrame(placeSheet);
    window.addEventListener('resize', placeSheet);

    const close = sheetRef.current?.querySelector<HTMLButtonElement>('.export-sheet-close');
    window.requestAnimationFrame(() => close?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('resize', placeSheet);
      document.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, [open]);

  return (
    <div className="export-control" ref={triggerRef}>
      <ChartTipButton
        label="Export"
        tip={open ? 'Close export' : 'Export'}
        expanded={open}
        popup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <ExportMark on={open} />
      </ChartTipButton>
      {mounted && open
        ? createPortal(
            <div className="export-layer">
              <button
                type="button"
                className="export-backdrop"
                aria-label="Close export"
                onClick={() => setOpen(false)}
              />
              <div
                ref={sheetRef}
                className="export-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <div className="export-sheet-head">
                  <p id={titleId} className="export-sheet-title">
                    Export
                  </p>
                  <button
                    type="button"
                    className="export-sheet-close"
                    aria-label="Close export"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="export-sheet-body">
                  <EmbedActions
                    slug={piece.slug}
                    title={piece.title}
                    note={piece.note}
                    source={source}
                    insight={insight}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
