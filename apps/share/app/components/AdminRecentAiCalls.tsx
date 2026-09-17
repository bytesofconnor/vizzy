'use client';

import { useState } from 'react';

export type AdminAiCallRow = {
  route: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
};

const PAGE = 12;

export function AdminRecentAiCalls({ rows }: { rows: AdminAiCallRow[] }) {
  const [limit, setLimit] = useState(PAGE);
  const visible = rows.slice(0, limit);
  const remaining = rows.length - limit;

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">Recent AI calls</p>
        <p className="admin-log-count">
          {rows.length} in the last 30 days
        </p>
      </div>
      <div className="admin-log-scroll">
        <table className="admin-log-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Route</th>
              <th scope="col">Model</th>
              <th scope="col" className="admin-log-num">
                In
              </th>
              <th scope="col" className="admin-log-num">
                Out
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const key = `${row.createdAt}-${row.route}-${row.model}`;
              return (
                <tr key={key}>
                  <td data-label="When">{formatWhen(row.createdAt)}</td>
                  <td data-label="Route">{aiRouteLabel(row.route)}</td>
                  <td data-label="Model">{shortModel(row.model)}</td>
                  <td data-label="In" className="admin-log-num">
                    {formatTokens(row.inputTokens)}
                  </td>
                  <td data-label="Out" className="admin-log-num">
                    {formatTokens(row.outputTokens)}
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
      ) : rows.length > PAGE ? (
        <p className="admin-log-count">Showing all {rows.length}</p>
      ) : null}
    </section>
  );
}

function aiRouteLabel(route: string): string {
  const labels: Record<string, string> = {
    compose: 'Draft chart',
    lookup: 'Lookup',
    lookup_sonar: 'Sonar lookup',
    revision_hints: 'Revision hints',
    hero_ideas: 'Home ideas',
    chart_insight: 'Chart insight',
    chart_lesson: 'Chart lesson',
  };
  return labels[route] ?? route.replace(/_/g, ' ');
}

function shortModel(model: string): string {
  const tail = model.split('/').pop() ?? model;
  return tail.length > 24 ? `${tail.slice(0, 21)}…` : tail;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
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
