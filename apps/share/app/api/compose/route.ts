import { consumeSlot, refundSlot } from '../../../lib/billing';
import { reportProgress, clientPiece, type ComposeProgressReporter } from '../../../lib/compose-progress';
import { pieceFromPrompt, publicComposeError } from '../../../lib/from-prompt';
import { pasteHref } from '../../../lib/paste';
import { payBody, payMessage } from '../../../lib/pay';
import { parseChartSeed, type ChartSeed } from '../../../lib/seed';
import { siteUrl } from '../../../lib/site';
import { recordAfterChart } from '../../../lib/telemetry';

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

function wantsStream(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/event-stream');
}

function sseLine(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function runCompose(
  origin: string,
  request: Request,
  prompt: string,
  seed: ChartSeed | undefined,
  onProgress?: ComposeProgressReporter
) {
  const minted = await pieceFromPrompt(prompt, seed, onProgress);
  if (!minted.ok) {
    return { ok: false as const, minted };
  }

  reportProgress(onProgress, {
    stage: 'save',
    progress: 94,
    message: 'Saving link…',
    barCount: minted.piece.data.length,
  });

  const paste = await pasteHref(origin.replace(/\/$/, ''), minted.token);
  await recordAfterChart({
    request,
    slug: paste.slug,
    title: minted.piece.title,
    route: 'compose',
  });

  reportProgress(onProgress, {
    stage: 'done',
    progress: 100,
    message: 'Ready to paste',
    url: paste.url,
    png: paste.png,
    token: minted.token,
    piece: clientPiece(minted.piece, paste.slug ?? minted.piece.slug),
    barCount: minted.piece.data.length,
  });

  return {
    ok: true as const,
    minted,
    paste,
  };
}

function streamCompose(
  origin: string,
  request: Request,
  prompt: string,
  seed: ChartSeed | undefined,
  slot: Awaited<ReturnType<typeof consumeSlot>>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send: ComposeProgressReporter = (event) => {
        controller.enqueue(encoder.encode(sseLine(event)));
      };

      try {
        const result = await runCompose(origin, request, prompt, seed, send);
        if (!result.ok) {
          if (slot.via === 'credit' || slot.via === 'free') {
            await refundSlot(request, slot.via);
          }
          send({
            stage: 'error',
            progress: 100,
            message: result.minted.error,
            error: result.minted.error,
          });
        }
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
        send({
          stage: 'error',
          progress: 100,
          message,
          error: message,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function GET() {
  const origin = siteUrl();
  return Response.json({
    ok: true,
    use: 'POST a text prompt as JSON { prompt, seed? } or form field prompt. No voice API. Humans get a chart page. Machines get { url, png }. Pass seed to revise the chart on the page. Shares the publish meter. Accept text/event-stream for live progress.',
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
      return Response.redirect(`${origin}/?error=${encodeURIComponent('Could not generate that chart. Try again in a moment.')}`, 303);
    }
    return Response.json({ ok: false, error: 'Could not generate that chart. Try again in a moment.' }, { status: 500 });
  }

  if (!slot.ok) {
    const message = payMessage();
    if (wantsHtml(request)) {
      return Response.redirect(`${origin}/?error=${encodeURIComponent(message)}&pay=1`, 303);
    }
    return Response.json(payBody(message), { status: 402 });
  }

  if (wantsStream(request) && !wantsHtml(request)) {
    return streamCompose(origin, request, prompt, seed, slot);
  }

  try {
    const result = await runCompose(origin, request, prompt, seed);
    if (!result.ok) {
      if (slot.via === 'credit' || slot.via === 'free') {
        await refundSlot(request, slot.via);
      }
      if (wantsHtml(request)) {
        return Response.redirect(`${origin}/?error=${encodeURIComponent(result.minted.error)}`, 303);
      }
      return Response.json(result.minted, { status: 400 });
    }

    if (wantsHtml(request)) {
      return Response.redirect(result.paste.url, 303);
    }
    return Response.json({
      ok: true,
      url: result.paste.url,
      png: result.paste.png,
      token: result.minted.token,
      piece: clientPiece(result.minted.piece, result.paste.slug ?? result.minted.piece.slug),
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
