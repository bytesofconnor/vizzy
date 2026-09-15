import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../../lib/pack';
import { publicOrigin } from '../../../lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = publicOrigin();
  const body = [
    'Vizzy is a chart you can paste.',
    'Bar, line, or scatter. You gather the rows. Do not invent D3.',
    '',
    `POST ${origin}/api/compose`,
    'JSON { "prompt": "ARR by quarter, last two years" }',
    'Returns { ok, url, png, token }. Humans get a chart page. Machines get JSON.',
    '',
    `POST ${origin}/api/publish`,
    'JSON { "title", "data": [ { ...rows } ], "config"?, "source"? }',
    'Emit ChartConfig v1. Attach source when you gathered the rows. Do not invent a URL.',
    '',
    `Schema: ${origin}/schema/chart-config.v1.json`,
    `API index: ${origin}/api`,
    `OpenAPI: ${origin}/openapi.json`,
    `Contract: ${origin}/llms.txt`,
    `Agents: ${origin}/agents`,
    '',
    `Three free charts a day (compose or publish). Then ${PACK_PRICE_LABEL} for ${PACK_CREDITS}.`,
    'After that, send the vizzy_wallet cookie or Authorization: Bearer <token>.',
    'Types in v1: bar, line, scatter. If a year is in progress, set chart.forecastFrom.',
  ].join('\n');

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
