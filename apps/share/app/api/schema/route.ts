import { chartConfigJsonSchema } from '@vizzy/core';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  return Response.json(chartConfigJsonSchema, {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
