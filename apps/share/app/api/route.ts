import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { publicOrigin, siteUrl } from '../../lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = siteUrl();
  return Response.json({
    ok: true,
    name: 'vizzy',
    description:
      'A chart you can paste. Type a prompt or publish rows. Bar, line, or scatter. You get a paste URL and a PNG. Text in; no voice API.',
    docs: `${origin}/llms.txt`,
    agents: `${origin}/agents`,
    schema: `${origin}/schema/chart-config.v1.json`,
    openapi: `${origin}/openapi.json`,
    types: ['bar', 'line', 'scatter'],
    compose: {
      method: 'POST',
      path: '/api/compose',
      body: { prompt: 'string', seed: 'optional chart seed from a paste page' },
      returns: { url: 'paste page', png: 'image', token: 'string' },
    },
    publish: {
      method: 'POST',
      path: '/api/publish',
      body: { title: 'string', data: 'rows', config: 'optional ChartConfig v1', source: 'optional' },
      returns: { url: 'paste page', png: 'image', token: 'string' },
    },
    quota: { method: 'GET', path: '/api/quota' },
    price: `${PACK_PRICE_LABEL} for ${PACK_CREDITS} charts after three free charts a day`,
    origin: publicOrigin(),
    schemaVersion: 1,
  });
}
