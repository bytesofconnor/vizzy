/** Add a connector: one entry here, one logo in ConnectorLogo, optional OAuth in google-oauth. */

export type ConnectorId = 'sheets' | 'wikipedia' | 'csv' | 'stripe' | 'notion' | 'postgres';

export type ConnectorConnect =
  | { kind: 'oauth'; provider: 'google'; scopes: readonly string[] }
  | { kind: 'instant'; prompt: string; focus?: boolean }
  | { kind: 'soon' };

export type ConnectorDef = {
  id: ConnectorId;
  name: string;
  /** Shown on connect finish page and tooltips */
  blurb: string;
  connect: ConnectorConnect;
  /** Hero order — lower first */
  order: number;
};

const CONNECTOR_LIST: ConnectorDef[] = [
  {
    id: 'sheets',
    name: 'Google Sheets',
    blurb: 'Chart rows from a spreadsheet you pick.',
    connect: {
      kind: 'oauth',
      provider: 'google',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    },
    order: 0,
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    blurb: 'Paste a Wikipedia link or topic — public numbers only.',
    connect: {
      kind: 'instant',
      prompt: 'Chart the numbers from https://en.wikipedia.org/wiki/',
      focus: true,
    },
    order: 1,
  },
  {
    id: 'csv',
    name: 'Paste table',
    blurb: 'Drop in a CSV or copied table from anywhere.',
    connect: {
      kind: 'instant',
      prompt: '',
      focus: true,
    },
    order: 2,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    blurb: 'MRR, churn, and charges — coming soon.',
    connect: { kind: 'soon' },
    order: 3,
  },
  {
    id: 'notion',
    name: 'Notion',
    blurb: 'Chart a database — coming soon.',
    connect: { kind: 'soon' },
    order: 4,
  },
  {
    id: 'postgres',
    name: 'Postgres',
    blurb: 'Read-only SQL templates — coming soon.',
    connect: { kind: 'soon' },
    order: 5,
  },
];

export const CONNECTORS: readonly ConnectorDef[] = [...CONNECTOR_LIST].sort((a, b) => a.order - b.order);

export const CONNECTOR_BY_ID: Record<ConnectorId, ConnectorDef> = Object.fromEntries(
  CONNECTORS.map((item) => [item.id, item])
) as Record<ConnectorId, ConnectorDef>;

export function isConnectorId(value: string): value is ConnectorId {
  return value in CONNECTOR_BY_ID;
}

/** Public catalog for API + client — no secrets */
export function publicConnector(item: ConnectorDef) {
  return {
    id: item.id,
    name: item.name,
    blurb: item.blurb,
    kind: item.connect.kind,
    available: item.connect.kind !== 'soon',
  };
}
