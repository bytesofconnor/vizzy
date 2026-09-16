'use client';

import { useState } from 'react';
import type { AdminEvalDto } from '../../lib/eval';

export function AdminEval({ run }: { run: AdminEvalDto | null }) {
  const [open, setOpen] = useState(false);

  if (!run) {
    return (
      <section className="admin-log-section">
        <div className="admin-log-head">
          <p className="admin-log-kicker">Eval</p>
        </div>
        <p className="admin-log-empty">
          No run recorded yet. CI publishes the canned grid on push to main.
        </p>
      </section>
    );
  }

  const pct = `${Math.round(run.rate * 100)}%`;
  const when = new Date(run.createdAt).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">Eval</p>
        <p className="admin-log-count">
          {run.passed}/{run.n} pass ({pct}) · {run.kind} · {when}
        </p>
      </div>
      <p className="admin-log-empty">
        {run.models.join(', ')} · {run.repeats} seeds · {run.brittle.length} brittle
      </p>
      <SliceTable title="Style" rows={run.byStyle} />
      <SliceTable title="Situation" rows={run.bySituation} />
      <SliceTable title="Model" rows={run.byModel} />
      {run.recs.length > 0 ? (
        <div className="admin-eval-recs">
          <p className="admin-log-kicker">Recommendations</p>
          <ul>
            {run.recs.map((rec) => (
              <li key={rec.id}>
                <span className="admin-log-mono">{rec.kind}</span>
                {rec.claim}
                <span className="admin-log-sub">{rec.evidence}. {rec.suggestedChange}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {run.fails.length > 0 ? (
        <p className="admin-log-count">
          <button type="button" className="admin-log-more" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : 'Show'} {run.fails.length} failing cells
          </button>
        </p>
      ) : null}
      {open ? (
        <div className="admin-log-scroll">
          <table className="admin-log-table admin-log-table--saved">
            <thead>
              <tr>
                <th scope="col">Cell</th>
                <th scope="col">Issues</th>
              </tr>
            </thead>
            <tbody>
              {run.fails.map((row) => (
                <tr key={`${row.promptId}-${row.model}-${row.seed}`}>
                  <td data-label="Cell">
                    <span className="admin-log-primary">
                      {row.promptId} · {row.model} · seed {row.seed}
                    </span>
                    <span className="admin-log-sub">{row.prompt}</span>
                  </td>
                  <td data-label="Issues" className="admin-log-mono">
                    {row.issues.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function SliceTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; n: number; passed: number; rate: number }>;
}) {
  return (
    <div className="admin-log-scroll">
      <table className="admin-log-table admin-log-table--saved">
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col" className="admin-log-num">
              Pass
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td data-label={title}>{row.key}</td>
              <td data-label="Pass" className="admin-log-num">
                {Math.round(row.rate * 100)}% ({row.passed}/{row.n})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
