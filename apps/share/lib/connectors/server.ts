import { CONNECTORS, publicConnector } from './catalog';
import { billingConfigured } from '../billing';

type ConvexResult<T> = { status: 'success'; value: T } | { status: 'error'; errorMessage?: string };

function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

function serverSecret(): string | undefined {
  return process.env.COMPOSE_SERVER_SECRET;
}

async function convexCall<T>(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>): Promise<T> {
  const url = convexUrl();
  const secret = serverSecret();
  if (!url || !secret) {
    throw new Error('Convex is not configured');
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: { secret, ...args }, format: 'json' }),
  });
  const body = (await response.json()) as ConvexResult<T>;
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'Convex call failed');
  }
  return body.value;
}

export type ActiveConnection = {
  connectorId: string;
  status: 'active' | 'revoked' | 'error';
  label?: string;
  updatedAt: number;
};

export async function listConnections(walletToken: string | undefined): Promise<ActiveConnection[]> {
  if (!billingConfigured() || !walletToken) {
    return [];
  }
  try {
    return await convexCall<ActiveConnection[]>('query', 'connections:listForWallet', { walletToken });
  } catch {
    return [];
  }
}

export async function saveConnection(args: {
  walletToken: string;
  connectorId: string;
  secrets: string;
  label?: string;
}): Promise<boolean> {
  const result = await convexCall<{ ok: boolean }>('mutation', 'connections:upsert', args);
  return result.ok;
}

export function connectorsCatalogPayload(connected: ActiveConnection[]) {
  const connectedIds = new Set(connected.map((row) => row.connectorId));
  return {
    connectors: CONNECTORS.map((item) => ({
      ...publicConnector(item),
      connected: connectedIds.has(item.id),
      label: connected.find((row) => row.connectorId === item.id)?.label,
    })),
  };
}
