'use client';

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FREE_PER_DAY, PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { PROMPT_LINES } from '../../lib/prompt-ideas';
import { heuristicRevisionPrompts } from '../../lib/revision-heuristics';
import type { ChartSeed } from '../../lib/seed';
import { DustRail } from './DustRail';
import type { ComposeProgressEvent } from '../../lib/compose-progress';
import { composeWithProgress } from '../../lib/compose-stream';
import { ComposeBusyPlot } from './ComposeBusyPlot';
import { HeroExamples } from './HeroExamples';
import { HeroTypewriter } from './HeroTypewriter';
import { usePromptTypewriter } from './usePromptTypewriter';

type Quota = {
  configured: boolean;
  canCompose: boolean;
  freeLeft: number;
  credits: number;
  unlimited?: boolean;
  saved?: boolean;
  justPaid?: boolean;
  offerGoogle?: boolean;
  packCredits: number;
  packPriceLabel: string;
};

export function ComposeBox({
  error,
  askPay,
  seed,
  variant = 'default',
}: {
  error?: string;
  askPay?: boolean;
  seed?: ChartSeed;
  variant?: 'default' | 'hero';
}) {
  const hero = variant === 'hero' && !seed;
  const studio = Boolean(seed);
  const card = hero || studio;
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [composeProgress, setComposeProgress] = useState<ComposeProgressEvent | null>(null);
  const [fail, setFail] = useState(error ?? '');
  const [pay, setPay] = useState(Boolean(askPay));
  const [quota, setQuota] = useState<Quota | null>(null);
  const [buying, setBuying] = useState(false);
  const [held, setHeld] = useState(false);
  const [focusHero, setFocusHero] = useState(false);
  const [revisionLines, setRevisionLines] = useState<readonly string[]>(() =>
    seed ? heuristicRevisionPrompts(seed) : []
  );
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const typeRef = useRef<HTMLDivElement | null>(null);
  const reviseTypeRef = useRef<HTMLDivElement | null>(null);

  const showTypewriter = hero && !busy && prompt.length === 0 && !held;
  const showReviseTypewriter = studio && !busy && prompt.length === 0 && !held;
  const { display: typedDisplay, fullPrompt: typedExample } = usePromptTypewriter(
    PROMPT_LINES,
    showTypewriter
  );
  const { display: reviseDisplay, fullPrompt: reviseExample } = usePromptTypewriter(
    revisionLines,
    showReviseTypewriter
  );

  const fitPromptHeight = useCallback(() => {
    const field = promptRef.current;
    if (!field) {
      return;
    }
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }, []);

  const onPickIdea = useCallback(
    (nextPrompt: string) => {
      if (busy) {
        return;
      }
      setPrompt(nextPrompt);
      setHeld(true);
      window.requestAnimationFrame(() => {
        const field = promptRef.current;
        if (!field) {
          return;
        }
        field.focus();
        const end = nextPrompt.length;
        field.setSelectionRange(end, end);
        fitPromptHeight();
      });
    },
    [busy, fitPromptHeight]
  );

  useEffect(() => {
    if (!seed) {
      return;
    }
    let cancel = false;
    void fetch('/api/revisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (cancel || typeof body !== 'object' || body === null || !('prompts' in body)) {
          return;
        }
        const prompts = (body as { prompts: unknown }).prompts;
        if (!Array.isArray(prompts) || prompts.length < 3) {
          return;
        }
        const next = prompts.filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
        if (next.length >= 3) {
          setRevisionLines(next);
        }
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [seed]);

  useEffect(() => {
    if (!hero && !studio) {
      return;
    }
    if (showTypewriter || showReviseTypewriter) {
      const syncIdleHeight = () => {
        const field = promptRef.current;
        const ghost = showTypewriter ? typeRef.current : reviseTypeRef.current;
        if (field && ghost) {
          field.style.height = `${ghost.offsetHeight}px`;
        }
      };
      syncIdleHeight();
      requestAnimationFrame(syncIdleHeight);
      return;
    }
    fitPromptHeight();
    const onResize = () => {
      if (showTypewriter || showReviseTypewriter) {
        const field = promptRef.current;
        const ghost = showTypewriter ? typeRef.current : reviseTypeRef.current;
        if (field && ghost) {
          field.style.height = `${ghost.offsetHeight}px`;
        }
        return;
      }
      fitPromptHeight();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [hero, studio, prompt, showTypewriter, showReviseTypewriter, typedDisplay, reviseDisplay, fitPromptHeight]);

  useEffect(() => {
    if (!hero) {
      return;
    }
    setFocusHero(window.matchMedia('(pointer: fine)').matches);
  }, [hero]);

  useEffect(() => {
    let cancel = false;
    void fetch('/api/quota')
      .then((response) => response.json())
      .then((body: unknown) => {
        if (cancel || !isQuota(body)) {
          return;
        }
        setQuota(body);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);


  async function submit() {
    let asked = prompt.trim();
    if (asked.length < 3 && hero && typedExample.trim().length >= 3) {
      asked = typedExample.trim();
    }
    if (busy || asked.length < 3) {
      return;
    }

    setBusy(true);
    setFail('');
    setPay(false);
    setComposeProgress({
      stage: 'queue',
      progress: 6,
      message: seed ? 'Reading your revision…' : 'Starting…',
    });

    try {
      const result = await composeWithProgress(
        seed ? { prompt: asked, seed } : { prompt: asked },
        setComposeProgress
      );
      if (result.ok) {
        window.location.assign(result.url);
        return;
      }

      setFail(result.error);
      if (result.pay) {
        setPay(true);
      }
    } catch {
      setFail('Could not generate that chart');
    }

    setBusy(false);
    setComposeProgress(null);
  }

  async function buy() {
    setBuying(true);
    setFail('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST' });
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string') {
        window.location.assign(body.url);
        return;
      }
      const message =
        typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Could not start checkout';
      setFail(message);
    } catch {
      setFail('Could not start checkout');
    }
    setBuying(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      id={seed ? 'again' : 'make-one'}
      className={hero ? 'compose-hero' : studio ? 'compose-studio' : undefined}
      onSubmit={onSubmit}
      style={{ marginTop: hero ? 0 : studio ? 0 : 16 }}
      aria-busy={busy}
    >
      <div className={hero ? 'compose-hero-inner' : studio ? 'compose-studio-inner' : undefined}>
        <label
          htmlFor={seed ? 'again-prompt' : 'prompt'}
          className={hero ? 'compose-hero-label' : studio ? 'compose-studio-label' : undefined}
          style={
            hero || studio
              ? undefined
              : {
                  display: 'block',
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--mute)',
                  marginBottom: 10,
                }
          }
        >
          {seed ? 'Revise it' : hero ? 'What should the chart show?' : 'Make one'}
        </label>
        {card ? (
          <div className="compose-hero-card">
            <DustRail className="compose-hero-rail dust-rail" />
            {busy ? (
              <ComposeBusyPlot
                variant={hero ? 'hero' : 'studio'}
                prompt={prompt}
                progress={composeProgress}
              />
            ) : (
              <>
                {hero ? (
                  <div className={showTypewriter ? 'compose-hero-field is-idle' : 'compose-hero-field'}>
                    {showTypewriter ? (
                      <HeroTypewriter display={typedDisplay} measureRef={typeRef} />
                    ) : null}
                    <textarea
                      ref={promptRef}
                      id="prompt"
                      name="prompt"
                      className={showTypewriter ? 'compose-hero-input is-dormant' : 'compose-hero-input'}
                      required
                      minLength={3}
                      maxLength={4000}
                      rows={1}
                      autoFocus={focusHero}
                      value={prompt}
                      onChange={(event) => {
                        setPrompt(event.target.value);
                        window.requestAnimationFrame(fitPromptHeight);
                      }}
                      onFocus={() => setHeld(true)}
                      onBlur={() => setHeld(false)}
                      onKeyDown={onKeyDown}
                      placeholder={showTypewriter ? '' : 'Paste a table, or drop in a source link.'}
                    />
                  </div>
                ) : (
                  <div
                    className={
                      showReviseTypewriter ? 'compose-hero-field is-idle' : 'compose-hero-field'
                    }
                  >
                    {showReviseTypewriter ? (
                      <HeroTypewriter display={reviseDisplay} measureRef={reviseTypeRef} />
                    ) : null}
                    <textarea
                      ref={promptRef}
                      id="again-prompt"
                      name="prompt"
                      className={
                        showReviseTypewriter
                          ? 'compose-hero-input compose-studio-input is-dormant'
                          : 'compose-hero-input compose-studio-input'
                      }
                      required
                      minLength={3}
                      maxLength={4000}
                      rows={showReviseTypewriter ? 1 : 2}
                      value={prompt}
                      onChange={(event) => {
                        setPrompt(event.target.value);
                        window.requestAnimationFrame(fitPromptHeight);
                      }}
                      onFocus={() => setHeld(true)}
                      onBlur={() => setHeld(false)}
                      onKeyDown={onKeyDown}
                      placeholder={showReviseTypewriter ? '' : 'Tell Vizzy what to change.'}
                    />
                  </div>
                )}
                <div className="compose-hero-bar">
                  <div className="compose-hero-actions">
                    <button type="submit" className="compose-hero-submit is-primary">
                      {studio ? 'Update chart' : 'Generate my chart'}
                    </button>
                    {hero && showTypewriter ? (
                      <button
                        type="button"
                        className="compose-hero-use"
                        onClick={() => onPickIdea(typedExample)}
                      >
                        Use this example
                      </button>
                    ) : null}
                    {studio && showReviseTypewriter ? (
                      <button
                        type="button"
                        className="compose-hero-use"
                        onClick={() => onPickIdea(reviseExample)}
                      >
                        Use suggestion
                      </button>
                    ) : null}
                  </div>
                  <span className="compose-hero-bar-note">
                    {hero ? (
                      <HeroPricingNote
                        quota={quota}
                        pay={pay}
                        buying={buying}
                        onBuy={() => void buy()}
                      />
                    ) : (
                      <StudioBarNote quota={quota} pay={pay} buying={buying} onBuy={() => void buy()} />
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : null}
        {hero ? (
          <>
            <div className={busy ? 'hero-examples-dim' : undefined}>
              <HeroExamples onPick={onPickIdea} />
            </div>
            {!busy ? (
              <p className="hero-jump">
                <a href="#examples">See example charts</a>
              </p>
            ) : null}
          </>
        ) : null}
        {fail && !busy ? (
          <p
            role="alert"
            className={hero ? 'compose-hero-alert' : undefined}
            style={{
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 12,
              color: 'var(--mute)',
              margin: '10px 0 0',
            }}
          >
            {fail}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function heroMarketingLine(): string {
  return `${FREE_PER_DAY} free today, then ${PACK_PRICE_LABEL} for ${PACK_CREDITS}`;
}

function heroPersonalBadge(quota: Quota | null): string | null {
  if (!quota?.configured) {
    return null;
  }
  if (quota.justPaid && (quota.credits ?? 0) > 0) {
    return `${quota.credits} added`;
  }
  if (quota.unlimited) {
    return 'Unlimited';
  }
  if (quota.credits > 0) {
    return `${quota.credits} left`;
  }
  if (quota.freeLeft > 0 && quota.freeLeft < FREE_PER_DAY) {
    return `${quota.freeLeft} free today`;
  }
  if (quota.freeLeft <= 0) {
    return 'No free charts today';
  }
  return null;
}

function HeroPricingNote({
  quota,
  pay,
  buying,
  onBuy,
}: {
  quota: Quota | null;
  pay: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const unlimited = Boolean(quota?.unlimited);
  const justPaid = Boolean(quota?.justPaid);
  const outOfFree =
    Boolean(quota?.configured) && !unlimited && quota.freeLeft <= 0 && (quota.credits ?? 0) <= 0;
  const showBuy = !unlimited && !justPaid && (pay || outOfFree);

  const badge = heroPersonalBadge(quota);
  const showMarketing = !unlimited && !justPaid;

  if (unlimited && badge) {
    return (
      <span className="compose-bar-note">
        <span className="compose-bar-note-badge">{badge}</span>
      </span>
    );
  }

  if (justPaid && badge) {
    return (
      <span className="compose-bar-note">
        <span className="compose-bar-note-badge">{badge}</span>
      </span>
    );
  }

  return (
    <span className="compose-bar-note">
      {badge ? (
        <>
          <span className="compose-bar-note-badge">{badge}</span>
          {showMarketing ? <span aria-hidden="true">·</span> : null}
        </>
      ) : null}
      {showMarketing ? <span className="compose-bar-note-status">{heroMarketingLine()}</span> : null}
      {showBuy ? (
        <span className="compose-bar-note-actions">
          {' · '}
          <button type="button" className="compose-hero-bar-buy" onClick={onBuy} disabled={buying}>
            {buying ? 'Opening…' : `${PACK_PRICE_LABEL} for ${PACK_CREDITS}`}
          </button>
        </span>
      ) : null}
    </span>
  );
}

function StudioBarNote({
  quota,
  pay,
  buying,
  onBuy,
}: {
  quota: Quota | null;
  pay: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const credits = quota?.credits ?? 0;
  const unlimited = Boolean(quota?.unlimited);
  const showBuy = !unlimited && !quota?.justPaid && (pay || Boolean(quota?.configured));

  let status = `${FREE_PER_DAY} free · link + PNG`;
  if (quota?.configured && unlimited && credits > 0) {
    status = `${credits} left · generate whenever`;
  } else if (quota?.configured && credits > 0) {
    status = `${credits} left`;
  } else if (quota?.configured && (quota.freeLeft ?? 0) > 0) {
    status = `${quota.freeLeft} free today`;
  } else if (quota?.configured) {
    status = 'No free charts today';
  }

  return (
    <span className="compose-bar-note">
      <span className="compose-bar-note-status">{status}</span>
      <span className="compose-bar-note-actions">
        <Link href="/me" className="compose-hero-bar-link">
          See usage
        </Link>
        {showBuy ? (
          <>
            {' · '}
            <button type="button" className="compose-hero-bar-buy" onClick={onBuy} disabled={buying}>
              {buying ? 'Opening…' : 'Buy charts'}
            </button>
          </>
        ) : null}
      </span>
    </span>
  );
}

function isQuota(value: unknown): value is Quota {
  return (
    typeof value === 'object' &&
    value !== null &&
    'configured' in value &&
    typeof value.configured === 'boolean' &&
    'canCompose' in value &&
    typeof value.canCompose === 'boolean' &&
    'freeLeft' in value &&
    typeof value.freeLeft === 'number' &&
    'credits' in value &&
    typeof value.credits === 'number'
  );
}
