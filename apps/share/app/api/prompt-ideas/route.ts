import { heroIdeasForHome } from '../../../lib/hero-ideas-ai';
import { parseHeroIdeas } from '../../../lib/hero-ideas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readExclude(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string').slice(0, 96);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const exclude =
    typeof body === 'object' && body !== null && 'exclude' in body
      ? readExclude((body as { exclude: unknown }).exclude)
      : [];
  const salt =
    typeof body === 'object' && body !== null && 'salt' in body && typeof (body as { salt: unknown }).salt === 'string'
      ? (body as { salt: string }).salt.slice(0, 40)
      : `${Date.now()}`;

  const reshuffle =
    typeof body === 'object' && body !== null && 'reshuffle' in body
      ? Boolean((body as { reshuffle: unknown }).reshuffle)
      : false;

  const ideas = await heroIdeasForHome(exclude, salt, reshuffle);
  return Response.json({ ok: true, ideas: parseHeroIdeas(ideas) });
}
