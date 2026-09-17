'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AccountChartRow } from './AccountChartsTable';
import { PinMark } from './PinMark';

export function AccountPinned({ charts }: { charts: AccountChartRow[] }) {
  const [rows, setRows] = useState(charts);

  async function unpin(slug: string) {
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

  return (
    <section className="pin-board" aria-labelledby="pinned-title">
      <div className="admin-log-head">
        <p id="pinned-title" className="admin-log-kicker">
          Pinned
        </p>
        {rows.length > 0 ? <p className="admin-log-count">{rows.length}</p> : null}
      </div>
      {rows.length === 0 ? (
        <p className="admin-log-empty">
          Pin a chart from Generate or a paste page. It stays on this dashboard.
        </p>
      ) : (
        <ul className="pin-board-list">
          {rows.map((chart) => (
            <li key={chart.slug} className="pin-board-card">
              <Link href={`/c/${chart.slug}`} className="pin-board-link">
                <img
                  src={`/c/${chart.slug}.png`}
                  alt=""
                  className="pin-board-thumb"
                  width={480}
                  height={280}
                />
                <p className="pin-board-title">{chart.title}</p>
              </Link>
              <button
                type="button"
                className="pin-button is-on"
                aria-label={`Unpin ${chart.title}`}
                title="Unpin"
                onClick={() => void unpin(chart.slug)}
              >
                <PinMark on />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
