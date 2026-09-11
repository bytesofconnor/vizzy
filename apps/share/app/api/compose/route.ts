import { pieceFromPrompt } from '../../../lib/from-prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function readPrompt(request: Request): Promise<string> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null && 'prompt' in body && typeof body.prompt === 'string') {
      return body.prompt;
    }
    return '';
  }
  const form = await request.formData();
  const value = form.get('prompt');
  return typeof value === 'string' ? value : '';
}

function wantsHtml(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html');
}

export async function GET() {
  return Response.json({
    ok: true,
    use: 'POST prompt as JSON { prompt } or form field prompt. Humans get a chart page. Machines get { url, png }.',
  });
}

export async function POST(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  let prompt = '';
  try {
    prompt = await readPrompt(request);
  } catch {
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=Say+what+to+chart`, 303);
    }
    return Response.json({ ok: false, error: 'prompt required' }, { status: 400 });
  }

  try {
    const minted = await pieceFromPrompt(prompt);
    if (!minted.ok) {
      if (wantsHtml(request)) {
        return Response.redirect(`${origin}/?error=${encodeURIComponent(minted.error)}`, 303);
      }
      return Response.json(minted, { status: 400 });
    }

    const path = `/c/x/${minted.token}`;
    const url = `${origin}${path}`;
    if (wantsHtml(request)) {
      return Response.redirect(url, 303);
    }
    return Response.json({
      ok: true,
      url,
      png: `${url}.png`,
      token: minted.token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chart failed';
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=${encodeURIComponent(message)}`, 303);
    }
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
