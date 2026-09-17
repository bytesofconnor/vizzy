'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HISTORY_REMOVED_EVENT, type AccountChartRow } from '../../lib/account-chart';
import { formatLibraryWhen, organizeSaved } from '../../lib/organize-library';
import { displayChartTitle } from '../../lib/remix-prompt';
import { PinMark } from './PinMark';

export function AccountPinned({ charts }: { charts: AccountChartRow[] }) {
  const [rows, setRows] = useState(charts);
  const [query, setQuery] = useState('');
  const [by, setBy] = useState<'date' | 'route'>('date');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    function onRemoved(event: Event) {
      const detail = (event as CustomEvent<{ slugs?: string[] }>).detail;
      const slugs = new Set(detail?.slugs ?? []);
      if (slugs.size === 0) {
        return;
      }
      setRows((current) => current.filter((row) => !slugs.has(row.slug)));
    }
    window.addEventListener(HISTORY_REMOVED_EVENT, onRemoved);
    return () => window.removeEventListener(HISTORY_REMOVED_EVENT, onRemoved);
  }, []);

  async function unsave(slug: string) {
    const response = await fetch('/api/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, pinned: false }),
    });
    if (!response.ok) {
      return;
    }
    setRows((current) => current.filter((row) => row.slug !== slug));
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((row) => displayChartTitle(row.title).toLowerCase().includes(needle));
  }, [query, rows]);

  const groups = useMemo(() => organizeSaved(filtered, Date.now(), by), [filtered, by]);
  const openLabel = open === null ? groups[0]?.label ?? null : open || null;

  return (
    <section className="pin-board" id="saved" aria-labelledby="saved-title">
      <div className="admin-log-head">
        <p id="saved-title" className="admin-log-kicker">
          Saved
        </p>
        {rows.length > 0 ? <p className="admin-log-count">{rows.length}</p> : null}
      </div>
      {rows.length === 0 ? (
        <p className="admin-log-empty">
          Save a chart from Generate or a paste page. It stays on this desk, up to 48.
        </p>
      ) : (
        <>
          <div className="me-filters" role="group" aria-label="Organize saved charts">
            <button
              type="button"
              className={by === 'date' ? 'me-filter is-on' : 'me-filter'}
              aria-pressed={by === 'date'}
              onClick={() => {
                setBy('date');
                setOpen(null);
              }}
            >
              By date
            </button>
            <button
              type="button"
              className={by === 'route' ? 'me-filter is-on' : 'me-filter'}
              aria-pressed={by === 'route'}
              onClick={() => {
                setBy('route');
                setOpen(null);
              }}
            >
              How you made it
            </button>
          </div>
          {rows.length > 6 ? (
            <label className="me-find-label">
              <span className="visually-hidden">Find a saved chart</span>
              <input
                type="search"
                className="me-find"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a saved chart"
                autoComplete="off"
              />
            </label>
          ) : null}
          {groups.length === 0 ? (
            <p className="admin-log-empty">No saved chart with that title.</p>
          ) : (
            <ul className="saved-groups">
              {groups.map((group) => {
                const expanded = openLabel === group.label;
                return (
                  <li key={group.label} className="saved-group">
                    <button
                      type="button"
                      className="saved-group-toggle"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded && groups.length > 1 ? '' : group.label)}
                    >
                      <span>{group.label}</span>
                      <span className="saved-group-count">{group.rows.length}</span>
                    </button>
                    {expanded ? (
                      <ul className="saved-rows">
                        {group.rows.map((chart) => (
                          <li key={chart.slug} className="saved-row">
                            <Link href={`/c/${chart.slug}`} className="saved-row-link">
                              <img
                                src={`/c/${chart.slug}.png`}
                                alt=""
                                className="saved-row-thumb"
                                width={96}
                                height={56}
                              />
                              <span className="saved-row-copy">
                                <span className="saved-row-title">{displayChartTitle(chart.title)}</span>
                                <span className="saved-row-when">{formatLibraryWhen(chart.createdAt)}</span>
                              </span>
                            </Link>
                            <span className="pin-control">
                              <button
                                type="button"
                                className="pin-button is-on"
                                aria-label="Remove from saved"
                                onClick={() => void unsave(chart.slug)}
                              >
                                <PinMark on />
                              </button>
                              <span role="tooltip" className="pin-tip">
                                Remove from saved
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
