import { walletTokenFromRequest } from '../../../lib/billing';
import { connectorsCatalogPayload, listConnections } from '../../../lib/connectors/server';
import { googleOAuthReady } from '../../../lib/connectors/google-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const walletToken = await walletTokenFromRequest(request);
  const connected = await listConnections(walletToken);
  return Response.json({
    ok: true,
    ...connectorsCatalogPayload(connected),
    oauth: { google: googleOAuthReady() },
  });
}
