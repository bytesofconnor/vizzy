'use client';

import Link from 'next/link';
import { useState } from 'react';

export type AdminSavedChartRow = {
  slug: string;
  title: string;
  route: 'compose' | 'publish';
  createdAt: number;
};

const PAGE = 12;

export function AdminRecentSavedCharts({ rows }: { rows: AdminSavedChartRow[] }) {
  const [limit, setLimit] = useState(PAGE);
  const visible = rows.slice(0, limit);
  const remaining = rows.length - limit;

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">Recent saved charts</p>
        <p className="admin-log-count">{rows.length} in the last 30 days</p>
      </div>
      <div className="admin-log-scroll">
        <table className="admin-log-table admin-log-table--saved">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Title</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const key = `${row.createdAt}-${row.slug}`;
              return (
                <tr key={key}>
                  <td data-label="When">{formatWhen(row.createdAt)}</td>
                  <td data-label="Title">
                    <Link href={`/c/${row.slug}`} className="admin-log-link">
                      {row.title}
                    </Link>
                  </td>
                  <td data-label="Source">{savedRouteLabel(row.route)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {remaining > 0 ? (
        <button
          type="button"
          className="admin-log-more"
          onClick={() => setLimit((current) => current + PAGE)}
        >
          Load {Math.min(PAGE, remaining)} more
        </button>
      ) : rows.length > PAGE ? (
        <p className="admin-log-count">Showing all {rows.length}</p>
      ) : null}
    </section>
  );
}

function savedRouteLabel(route: AdminSavedChartRow['route']): string {
  return route === 'compose' ? 'From prompt' : 'From API';
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
