import { formatPerMillion } from '../../lib/ai-gateway';

export type AdminModelCatalogRow = {
  id: string;
  name: string;
  inputPerToken?: number;
  outputPerToken?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  calls: number;
  inputTokens: number;
};

export function AdminModelCatalog({
  rows,
  error,
}: {
  rows: AdminModelCatalogRow[];
  error?: string;
}) {
  if (error) {
    return (
      <section className="admin-log-section">
        <div className="admin-log-head">
          <p className="admin-log-kicker">AI · model catalog</p>
        </div>
        <p className="admin-log-empty">{error}</p>
      </section>
    );
  }

  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">AI · model catalog</p>
        <p className="admin-log-count">{rows.length} models in stack</p>
      </div>
      <div className="admin-log-scroll">
        <table className="admin-log-table admin-log-table--catalog">
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col" className="admin-log-num">
                In
              </th>
              <th scope="col" className="admin-log-num">
                Out
              </th>
              <th scope="col" className="admin-log-num">
                Context
              </th>
              <th scope="col" className="admin-log-num">
                Logged
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Model">
                  <span className="admin-log-primary">{row.name}</span>
                  <span className="admin-log-sub">{shortModelId(row.id)}</span>
                </td>
                <td data-label="In" className="admin-log-num">
                  {row.inputPerToken !== undefined ? formatPerMillion(row.inputPerToken) : '—'}
                </td>
                <td data-label="Out" className="admin-log-num">
                  {row.outputPerToken !== undefined ? formatPerMillion(row.outputPerToken) : '—'}
                </td>
                <td data-label="Context" className="admin-log-num">
                  {row.contextWindow ? formatTokens(row.contextWindow) : '—'}
                </td>
                <td data-label="Logged" className="admin-log-num">
                  {row.calls > 0 ? (
                    <>
                      {row.calls} · {formatTokens(row.inputTokens)} in
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function shortModelId(id: string): string {
  const parts = id.split('/');
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return id;
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
