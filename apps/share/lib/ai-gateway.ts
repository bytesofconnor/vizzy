import { STACK_MODELS } from './ai-models';

const GATEWAY_BASE = 'https://ai-gateway.vercel.sh/v1';

export type GatewayCredits = {
  balanceUsd: number;
  totalUsedUsd: number;
};

export type GatewayModelRate = {
  id: string;
  name: string;
  inputPerToken: number;
  outputPerToken: number;
  contextWindow?: number;
  maxOutputTokens?: number;
};

export type GatewayStatus = {
  configured: boolean;
  credits: GatewayCredits | null;
  creditsError?: string;
  catalog: GatewayModelRate[];
  catalogError?: string;
};

type AiSpendRow = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  calls?: number;
};

function gatewayKey(): string | undefined {
  return process.env.AI_GATEWAY_API_KEY?.trim() || undefined;
}

async function gatewayFetch(path: string, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const key = gatewayKey();
  if (auth) {
    if (!key) {
      throw new Error('AI_GATEWAY_API_KEY is not set');
    }
    headers.Authorization = `Bearer ${key}`;
  }
  return fetch(`${GATEWAY_BASE}${path}`, { headers, next: { revalidate: 60 } });
}

export async function fetchGatewayCredits(): Promise<GatewayCredits | null> {
  if (!gatewayKey()) {
    return null;
  }
  const response = await gatewayFetch('/credits', true);
  if (!response.ok) {
    throw new Error(`Gateway credits ${response.status}`);
  }
  const body = (await response.json()) as { balance?: string; total_used?: string };
  return {
    balanceUsd: Number(body.balance ?? 0),
    totalUsedUsd: Number(body.total_used ?? 0),
  };
}

export async function fetchGatewayCatalog(ids?: string[]): Promise<GatewayModelRate[]> {
  const response = await gatewayFetch('/models', false);
  if (!response.ok) {
    throw new Error(`Gateway models ${response.status}`);
  }
  const body = (await response.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      context_window?: number;
      max_tokens?: number;
      pricing?: { input?: string; output?: string };
    }>;
  };
  const want = new Set(ids ?? STACK_MODELS);
  const out: GatewayModelRate[] = [];
  for (const row of body.data ?? []) {
    if (!want.has(row.id)) {
      continue;
    }
    out.push({
      id: row.id,
      name: row.name ?? row.id,
      inputPerToken: Number(row.pricing?.input ?? 0),
      outputPerToken: Number(row.pricing?.output ?? 0),
      contextWindow: row.context_window,
      maxOutputTokens: row.max_tokens,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchGatewayStatus(): Promise<GatewayStatus> {
  const configured = Boolean(gatewayKey());
  let credits: GatewayCredits | null = null;
  let creditsError: string | undefined;
  let catalog: GatewayModelRate[] = [];
  let catalogError: string | undefined;

  if (configured) {
    try {
      credits = await fetchGatewayCredits();
    } catch (error) {
      creditsError = error instanceof Error ? error.message : 'Could not load credits';
    }
  }

  try {
    catalog = await fetchGatewayCatalog();
  } catch (error) {
    catalogError = error instanceof Error ? error.message : 'Could not load model catalog';
  }

  return { configured, credits, creditsError, catalog, catalogError };
}

export function estimateLoggedSpend(
  rows: AiSpendRow[],
  catalog: GatewayModelRate[]
): { usd: number; unknownModels: string[] } {
  const rates = new Map(catalog.map((row) => [row.id, row]));
  let usd = 0;
  const unknown = new Set<string>();
  for (const row of rows) {
    const rate = rates.get(row.model);
    if (!rate) {
      unknown.add(row.model);
      continue;
    }
    usd += row.inputTokens * rate.inputPerToken + row.outputTokens * rate.outputPerToken;
  }
  return { usd: Math.round(usd * 10000) / 10000, unknownModels: [...unknown] };
}

export function formatUsd(amount: number): string {
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  }
  if (amount >= 0.01) {
    return `$${amount.toFixed(2)}`;
  }
  if (amount > 0) {
    return `<$0.01`;
  }
  return '$0.00';
}

export function formatPerMillion(perToken: number): string {
  const perM = perToken * 1_000_000;
  if (perM >= 1) {
    return `$${perM.toFixed(2)}/M`;
  }
  if (perM >= 0.01) {
    return `$${perM.toFixed(2)}/M`;
  }
  return `$${perM.toFixed(4)}/M`;
}
