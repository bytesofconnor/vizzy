'use client';

import Link from 'next/link';
import { useState } from 'react';

export type AccountChartRow = {
  slug: string;
  title: string;
  route: 'compose' | 'publish';
  createdAt: number;
};

const PAGE = 12;

export function AccountChartsTable({
  charts,
  saved,
}: {
  charts: AccountChartRow[];
  saved: boolean;
}) {
  const [limit, setLimit] = useState(PAGE);
  const visible = charts.slice(0, limit);
  const remaining = charts.length - limit;

  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">Your charts</p>
        {charts.length > 0 ? (
          <p className="admin-log-count">{charts.length} saved</p>
        ) : null}
      </div>
      {charts.length === 0 ? (
        <p className="admin-log-empty">
          {saved
            ? 'Charts you make show up here as links you can reopen on any device.'
            : 'Charts you make on this browser show up here as links you can reopen.'}
        </p>
      ) : (
        <>
          <div className="admin-log-scroll">
            <table className="admin-log-table admin-log-table--saved">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Title</th>
                  <th scope="col">Source</th>
                  <th scope="col">Slug</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((chart) => {
                  const key = `${chart.createdAt}-${chart.slug}`;
                  return (
                    <tr key={key}>
                      <td data-label="When">{formatWhen(chart.createdAt)}</td>
                      <td data-label="Title">
                        <Link href={`/c/${chart.slug}`} className="admin-log-link">
                          {chart.title}
                        </Link>
                      </td>
                      <td data-label="Source">{routeLabel(chart.route)}</td>
                      <td data-label="Slug" className="admin-log-mono">
                        <Link href={`/c/${chart.slug}`} className="admin-log-link admin-log-slug">
                          {chart.slug}
                        </Link>
                      </td>
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
          ) : charts.length > PAGE ? (
            <p className="admin-log-count">Showing all {charts.length}</p>
          ) : null}
        </>
      )}
    </section>
  );
}

function routeLabel(route: AccountChartRow['route']): string {
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
