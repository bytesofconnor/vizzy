import { consumeSlot, refundSlot } from '../../../lib/billing';
import { pieceFromPrompt, publicComposeError } from '../../../lib/from-prompt';
import { pasteHref } from '../../../lib/paste';
import { payBody, payMessage } from '../../../lib/pay';
import { parseChartSeed, type ChartSeed } from '../../../lib/seed';
import { siteUrl } from '../../../lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function readCompose(request: Request): Promise<{ prompt: string; seed?: ChartSeed }> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('prompt' in body) || typeof body.prompt !== 'string') {
      return { prompt: '' };
    }
    return {
      prompt: body.prompt,
      seed: 'seed' in body ? parseChartSeed(body.seed) : undefined,
    };
  }
  const form = await request.formData();
  const value = form.get('prompt');
  return { prompt: typeof value === 'string' ? value : '' };
}

function wantsHtml(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html');
}

export async function GET() {
  const origin = siteUrl();
  return Response.json({
    ok: true,
    use: 'POST prompt as JSON { prompt, seed? } or form field prompt. Humans get a chart page. Machines get { url, png }. Pass seed to revise the chart on the page. Shares the publish meter.',
    schema: `${origin}/schema/chart-config.v1.json`,
    docs: `${origin}/llms.txt`,
    agents: `${origin}/agents`,
    openapi: `${origin}/openapi.json`,
    index: `${origin}/api`,
  });
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  let prompt = '';
  let seed: ChartSeed | undefined;
  try {
    const body = await readCompose(request);
    prompt = body.prompt;
    seed = body.seed;
  } catch {
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=Say+what+to+chart`, 303);
    }
    return Response.json({ ok: false, error: 'prompt required' }, { status: 400 });
  }

  let slot: Awaited<ReturnType<typeof consumeSlot>>;
  try {
    slot = await consumeSlot(request);
  } catch (error) {
    console.error('compose quota failed', error);
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=${encodeURIComponent('Could not draw that. Try again in a moment.')}`, 303);
    }
    return Response.json({ ok: false, error: 'Could not draw that. Try again in a moment.' }, { status: 500 });
  }

  if (!slot.ok) {
    const message = payMessage();
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=${encodeURIComponent(message)}&pay=1`, 303);
    }
    return Response.json(payBody(message), { status: 402 });
  }

  try {
    const minted = await pieceFromPrompt(prompt, seed);
    if (!minted.ok) {
      if (slot.via === 'credit' || slot.via === 'free') {
        await refundSlot(request, slot.via);
      }
      if (wantsHtml(request)) {
        return Response.redirect(`${origin}/?error=${encodeURIComponent(minted.error)}`, 303);
      }
      return Response.json(minted, { status: 400 });
    }

    const paste = await pasteHref(origin.replace(/\/$/, ''), minted.token);
    if (wantsHtml(request)) {
      return Response.redirect(paste.url, 303);
    }
    return Response.json({
      ok: true,
      url: paste.url,
      png: paste.png,
      token: minted.token,
    });
  } catch (error) {
    if (slot.via === 'credit' || slot.via === 'free') {
      try {
        await refundSlot(request, slot.via);
      } catch (refundError) {
        console.error('compose refund failed', refundError);
      }
    }
    console.error('compose failed', error);
    const message = publicComposeError(error);
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=${encodeURIComponent(message)}`, 303);
    }
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
