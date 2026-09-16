import { PACK_PRICE_LABEL } from '../../lib/pack';

export type AccountPurchaseRow = {
  createdAt: number;
  credits: number;
  stripeSessionId: string;
};

export function AccountPurchasesTable({ orders }: { orders: AccountPurchaseRow[] }) {
  return (
    <section className="admin-log-section">
      <div className="admin-log-head">
        <p className="admin-log-kicker">Purchases</p>
        {orders.length > 0 ? (
          <p className="admin-log-count">{orders.length} charge{orders.length === 1 ? '' : 's'}</p>
        ) : null}
      </div>
      {orders.length === 0 ? (
        <p className="admin-log-empty">No Stripe charges on this account.</p>
      ) : (
        <div className="admin-log-scroll">
          <table className="admin-log-table admin-log-table--purchases">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col" className="admin-log-num">
                  Charts
                </th>
                <th scope="col" className="admin-log-num">
                  Paid
                </th>
                <th scope="col">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const key = `${order.createdAt}-${order.stripeSessionId}`;
                return (
                  <tr key={key}>
                    <td data-label="When">{formatWhen(order.createdAt)}</td>
                    <td data-label="Charts" className="admin-log-num">
                      {order.credits}
                    </td>
                    <td data-label="Paid" className="admin-log-num">
                      {PACK_PRICE_LABEL}
                    </td>
                    <td data-label="Receipt" className="admin-log-mono">
                      <span className="admin-log-slug" title={order.stripeSessionId}>
                        {shortReceipt(order.stripeSessionId)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function shortReceipt(sessionId: string): string {
  if (sessionId.length <= 16) {
    return sessionId;
  }
  return `${sessionId.slice(0, 10)}…${sessionId.slice(-4)}`;
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
