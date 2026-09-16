'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  githubEvalIssueUrl,
  setEvalRecStatus,
  type AdminEvalDto,
  type AdminEvalSlice,
  type EvalRecLoop,
} from '../../lib/eval';

export function AdminEval({ run }: { run: AdminEvalDto | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!run) {
    return (
      <section className="admin-log-section">
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
  const cuts = packCuts(run).sort((a, b) => a.rate - b.rate);
  const issues = [...(run.byIssue ?? [])].sort((a, b) => b.n - a.n);
  const fails = [...run.fails].sort(
    (a, b) =>
      (a.issues[0] ?? '').localeCompare(b.issues[0] ?? '') ||
      a.promptId.localeCompare(b.promptId) ||
      a.seed - b.seed,
  );
  const weak = cuts.slice(0, 3);

  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">
          {run.passed}/{run.n} pass ({pct})
        </p>
        <p className="admin-log-count">
          {run.models.join(', ')} · {run.kind} · {when} · {run.repeats} seeds · {run.brittle.length} brittle
        </p>
      </div>
      {weak.length > 0 ? (
        <p className="admin-eval-weak">
          Weakest: {weak.map((row) => `${row.key} ${Math.round(row.rate * 100)}%`).join(' · ')}
        </p>
      ) : null}
      {run.clearedRecIds && run.clearedRecIds.length > 0 ? (
        <p className="admin-eval-weak">
          Cleared since last run: {run.clearedRecIds.join(', ')} — the grid no longer emits those recs.
        </p>
      ) : null}
      <SliceTable rows={cuts} />
      {issues.length > 0 ? (
        <div className="admin-log-scroll">
          <table className="admin-log-table admin-log-table--eval">
            <thead>
              <tr>
                <th scope="col">Issue</th>
                <th scope="col" className="admin-log-num">
                  n
                </th>
              </tr>
            </thead>
            <tbody>
              {issues.map((row) => (
                <tr key={row.code}>
                  <td data-label="Issue" className="admin-log-mono">
                    {row.code}
                  </td>
                  <td data-label="n" className="admin-log-num">
                    {row.n}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {run.recs.length > 0 ? (
        <RecList recs={run.recs} onChanged={() => router.refresh()} />
      ) : null}
      {fails.length > 0 ? (
        <p className="admin-log-count">
          <button type="button" className="admin-log-more" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : 'Show'} {fails.length} failing cells
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
              {fails.map((row) => (
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

function RecList({
  recs,
  onChanged,
}: {
  recs: AdminEvalDto['recs'];
  onChanged: () => void;
}) {
  const open = recs.filter((rec) => rec.loop !== 'wont');
  const parked = recs.filter((rec) => rec.loop === 'wont');
  return (
    <div className="admin-eval-recs">
      <p className="admin-log-kicker">Recommendations</p>
      <p className="admin-eval-weak">
        Regenerated every CI eval. They do not change compose. Working = you are changing code; Park =
        ignore until the grid drops it. Issue opens GitHub with this rec filled in.
      </p>
      <ul>
        {open.map((rec) => (
          <RecItem key={rec.id} rec={rec} onChanged={onChanged} />
        ))}
      </ul>
      {parked.length > 0 ? (
        <>
          <p className="admin-log-kicker" style={{ marginTop: 20 }}>
            Parked
          </p>
          <ul>
            {parked.map((rec) => (
              <RecItem key={rec.id} rec={rec} onChanged={onChanged} />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function RecItem({
  rec,
  onChanged,
}: {
  rec: AdminEvalDto['recs'][number];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const loop: EvalRecLoop = rec.loop ?? 'open';

  async function setLoop(status: EvalRecLoop) {
    setBusy(true);
    try {
      await setEvalRecStatus(rec.id, status);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <p className="admin-eval-kind">
        {rec.kind}
        {loop !== 'open' ? ` · ${loop}` : ''}
      </p>
      <p className="admin-eval-claim">{rec.claim}</p>
      <p className="admin-log-sub">{rec.evidence}</p>
      <p className="admin-eval-next">{rec.suggestedChange}</p>
      <p className="admin-eval-actions">
        {loop !== 'working' ? (
          <button type="button" className="admin-eval-act" disabled={busy} onClick={() => setLoop('working')}>
            Working
          </button>
        ) : (
          <button type="button" className="admin-eval-act" disabled={busy} onClick={() => setLoop('open')}>
            Open
          </button>
        )}
        {loop !== 'wont' ? (
          <button type="button" className="admin-eval-act" disabled={busy} onClick={() => setLoop('wont')}>
            Park
          </button>
        ) : (
          <button type="button" className="admin-eval-act" disabled={busy} onClick={() => setLoop('open')}>
            Restore
          </button>
        )}
        <a className="admin-eval-act" href={githubEvalIssueUrl(rec)} target="_blank" rel="noopener noreferrer">
          GitHub issue
        </a>
      </p>
    </li>
  );
}

function packCuts(run: AdminEvalDto): Array<AdminEvalSlice & { cut: string }> {
  return [
    ...run.bySituation.map((row) => ({ ...row, cut: 'situation' })),
    ...run.byStyle.map((row) => ({ ...row, cut: 'style' })),
    ...(run.byDomain ?? []).map((row) => ({ ...row, cut: 'domain' })),
    ...run.byModel.map((row) => ({ ...row, cut: 'model' })),
  ];
}

function SliceTable({ rows }: { rows: Array<AdminEvalSlice & { cut: string }> }) {
  return (
    <div className="admin-log-scroll">
      <table className="admin-log-table admin-log-table--eval">
        <thead>
          <tr>
            <th scope="col">Cut</th>
            <th scope="col">Key</th>
            <th scope="col" className="admin-log-num">
              Pass
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.cut}-${row.key}`}>
              <td data-label="Cut" className="admin-log-mono">
                {row.cut}
              </td>
              <td data-label="Key">{row.key}</td>
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
