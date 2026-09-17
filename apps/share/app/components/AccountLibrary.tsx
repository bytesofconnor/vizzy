'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HISTORY_REMOVED_EVENT,
  type AccountChartRow,
  type AccountLibraryKind,
  type AccountLibraryPage,
} from '../../lib/account-chart';
import { formatLibraryWhen, organizeLibrary, routeLabel } from '../../lib/organize-library';
import { displayChartTitle } from '../../lib/remix-prompt';
import { PinMark } from './PinMark';

const KINDS: Array<{ id: AccountLibraryKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: 'Saved' },
  { id: 'compose', label: 'You typed' },
  { id: 'publish', label: 'An agent' },
];

export function AccountLibrary({
  initial,
  saved,
}: {
  initial: AccountLibraryPage;
  saved: boolean;
}) {
  const [kind, setKind] = useState<AccountLibraryKind>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState(initial.page);
  const [cursor, setCursor] = useState(initial.continueCursor);
  const [done, setDone] = useState(initial.isDone);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [fail, setFail] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(draft.trim()), 220);
    return () => window.clearTimeout(handle);
  }, [draft]);

  useEffect(() => {
    if (kind === 'all' && query.length < 2) {
      setRows(initial.page);
      setCursor(initial.continueCursor);
      setDone(initial.isDone);
      setSelected(new Set());
      return;
    }
    let ignore = false;
    setLoading(true);
    const params = new URLSearchParams({ kind });
    if (query.length >= 2) {
      params.set('q', query);
    }
    void fetch(`/api/me/charts?${params}`)
      .then((response) => response.json() as Promise<AccountLibraryPage & { ok?: boolean }>)
      .then((body) => {
        if (ignore) {
          return;
        }
        setRows(body.page ?? []);
        setCursor(body.continueCursor ?? '');
        setDone(Boolean(body.isDone));
        setSelected(new Set());
      })
      .catch(() => {
        if (!ignore) {
          setRows([]);
          setDone(true);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [kind, query, initial]);

  async function loadMore() {
    if (done || loading) {
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ kind, cursor });
    if (query.length >= 2) {
      params.set('q', query);
    }
    try {
      const response = await fetch(`/api/me/charts?${params}`);
      const body = (await response.json()) as AccountLibraryPage;
      setRows((current) => [...current, ...(body.page ?? [])]);
      setCursor(body.continueCursor ?? '');
      setDone(Boolean(body.isDone));
    } finally {
      setLoading(false);
    }
  }

  const buckets = useMemo(() => organizeLibrary(rows), [rows]);
  const visibleSlugs = useMemo(
    () => rows.map((row) => row.slug).filter((slug, index, list) => list.indexOf(slug) === index),
    [rows]
  );
  const shown = buckets.reduce((sum, bucket) => sum + bucket.clusters.length, 0);
  const picked = selected.size;
  const allVisibleSelected = visibleSlugs.length > 0 && visibleSlugs.every((slug) => selected.has(slug));

  function toggleSlug(slug: string, on?: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      const enable = on ?? !next.has(slug);
      if (enable) {
        next.add(slug);
      } else {
        next.delete(slug);
      }
      return next;
    });
  }

  function toggleSlugs(slugs: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const slug of slugs) {
        if (on) {
          next.add(slug);
        } else {
          next.delete(slug);
        }
      }
      return next;
    });
  }

  async function removeSelected() {
    if (picked === 0 || removing) {
      return;
    }
    setRemoving(true);
    setFail('');
    const slugs = [...selected];
    try {
      const response = await fetch('/api/me/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setFail(body.error || 'Could not remove those charts.');
        return;
      }
      const drop = new Set(slugs);
      setRows((current) => current.filter((row) => !drop.has(row.slug)));
      setSelected(new Set());
      setConfirming(false);
      window.dispatchEvent(new CustomEvent(HISTORY_REMOVED_EVENT, { detail: { slugs } }));
    } catch {
      setFail('Could not remove those charts.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className="me-library" id="library" aria-labelledby="library-title">
      <div className="admin-log-head">
        <p id="library-title" className="admin-log-kicker">
          Library
        </p>
        {shown > 0 ? (
          <p className="admin-log-count">
            {loading ? 'Looking…' : `${shown}${done ? '' : '+'}`}
          </p>
        ) : null}
      </div>
      <label className="me-find-label">
        <span className="visually-hidden">Find a chart</span>
        <input
          type="search"
          className="me-find"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Find a title"
          autoComplete="off"
        />
      </label>
      <div className="me-filters" role="group" aria-label="Filter charts">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={kind === item.id}
            className={kind === item.id ? 'me-filter is-on' : 'me-filter'}
            onClick={() => setKind(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visibleSlugs.length > 0 ? (
        <div className="me-select-bar">
          <label className="me-check">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => toggleSlugs(visibleSlugs, !allVisibleSelected)}
            />
            Select all on this page
          </label>
          {picked > 0 ? (
            <>
              <span className="me-select-count">
                {picked} selected
              </span>
              <button type="button" className="me-select-clear" onClick={() => setSelected(new Set())}>
                Clear
              </button>
              <button type="button" className="me-select-remove" onClick={() => setConfirming(true)}>
                Remove from history
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {buckets.length === 0 ? (
        <p className="admin-log-empty">
          {query.length >= 2
            ? 'Nothing with that title yet.'
            : saved
              ? 'Charts you make show up here as paste links. Save the keepers above.'
              : 'Charts you make on this browser show up here. Save the keepers above.'}
        </p>
      ) : (
        <div className="me-buckets">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="me-bucket">
              <p className="me-bucket-label">{bucket.label}</p>
              <ul className="me-cluster-list">
                {bucket.clusters.map((cluster) => {
                  const many = cluster.versions.length > 1;
                  const key = cluster.latest.slug;
                  const expanded = open === key;
                  const versionSlugs = cluster.versions.map((version) => version.slug);
                  const pickedCount = versionSlugs.filter((slug) => selected.has(slug)).length;
                  return (
                    <li key={key} className={pickedCount ? 'me-cluster is-picked' : 'me-cluster'}>
                      <label className="me-check me-check-row">
                        <input
                          type="checkbox"
                          checked={pickedCount === versionSlugs.length}
                          ref={(node) => {
                            if (node) {
                              node.indeterminate = pickedCount > 0 && pickedCount < versionSlugs.length;
                            }
                          }}
                          onChange={() =>
                            toggleSlugs(versionSlugs, pickedCount !== versionSlugs.length)
                          }
                          aria-label={`Select ${displayChartTitle(cluster.title)}`}
                        />
                      </label>
                      <div className="me-cluster-body">
                        <div className="me-cluster-top">
                          <Link href={`/c/${cluster.latest.slug}`} className="me-cluster-title">
                            {displayChartTitle(cluster.title)}
                          </Link>
                          <span className="me-cluster-meta">
                            {cluster.latest.pinned ? (
                              <span className="me-cluster-pin" title="Saved">
                                <PinMark on />
                              </span>
                            ) : null}
                            <span>
                              {many ? `${cluster.versions.length} versions` : routeLabel(cluster.latest.route)}
                            </span>
                            <time dateTime={new Date(cluster.latest.createdAt).toISOString()}>
                              {formatLibraryWhen(cluster.latest.createdAt)}
                            </time>
                          </span>
                        </div>
                        {many ? (
                          <>
                            <button
                              type="button"
                              className="me-cluster-toggle"
                              aria-expanded={expanded}
                              onClick={() => setOpen(expanded ? null : key)}
                            >
                              {expanded ? 'Hide versions' : 'Show versions'}
                            </button>
                            {expanded ? (
                              <ul className="me-versions">
                                {cluster.versions.map((version) => (
                                  <li key={version.slug}>
                                    <label className="me-check">
                                      <input
                                        type="checkbox"
                                        checked={selected.has(version.slug)}
                                        onChange={() => toggleSlug(version.slug)}
                                        aria-label={`Select version from ${formatLibraryWhen(version.createdAt)}`}
                                      />
                                    </label>
                                    <Link href={`/c/${version.slug}`}>{formatLibraryWhen(version.createdAt)}</Link>
                                    <span>{routeLabel(version.route)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {!done && buckets.length > 0 ? (
        <button type="button" className="admin-log-more" onClick={() => void loadMore()} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
      {confirming ? (
        <RemoveConfirm
          count={picked}
          titles={titlesFor(rows, selected)}
          fail={fail}
          busy={removing}
          onCancel={() => {
            setConfirming(false);
            setFail('');
          }}
          onConfirm={() => void removeSelected()}
        />
      ) : null}
    </section>
  );
}

function titlesFor(rows: AccountChartRow[], selected: Set<string>): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!selected.has(row.slug) || seen.has(row.title)) {
      continue;
    }
    seen.add(row.title);
    titles.push(displayChartTitle(row.title));
    if (titles.length === 3) {
      break;
    }
  }
  return titles;
}

function RemoveConfirm({
  count,
  titles,
  fail,
  busy,
  onCancel,
  onConfirm,
}: {
  count: number;
  titles: string[];
  fail: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const extra = count - titles.length;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="me-confirm-layer">
      <button type="button" className="export-backdrop" aria-label="Close" onClick={busy ? undefined : onCancel} />
      <div
        className="me-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-history-title"
      >
        <p id="remove-history-title" className="me-confirm-title">
          Remove from your history?
        </p>
        <p className="me-confirm-copy">
          {count === 1
            ? 'This chart leaves this desk. Anyone with the paste link can still open it.'
            : `${count} charts leave this desk. Anyone with the paste links can still open them.`}
        </p>
        {titles.length > 0 ? (
          <ul className="me-confirm-list">
            {titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
            {extra > 0 ? <li>and {extra} more</li> : null}
          </ul>
        ) : null}
        {fail ? (
          <p className="me-confirm-fail" role="alert">
            {fail}
          </p>
        ) : null}
        <div className="me-confirm-actions">
          <button type="button" className="me-confirm-keep" onClick={onCancel} disabled={busy}>
            Keep them
          </button>
          <button type="button" className="me-confirm-drop" onClick={onConfirm} disabled={busy}>
            {busy ? 'Removing…' : count === 1 ? 'Remove it' : `Remove ${count}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
