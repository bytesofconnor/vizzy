'use client';

import type { ComposeProgressEvent, ClientPiece } from './compose-progress';

export type ComposeStreamResult =
  | { ok: true; url: string; png?: string; token?: string; piece?: ClientPiece }
  | { ok: false; error: string; pay?: boolean };

function parseSseChunk(buffer: string): { events: ComposeProgressEvent[]; rest: string } {
  const events: ComposeProgressEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';

  for (const part of parts) {
    const line = part
      .split('\n')
      .map((item) => item.trim())
      .find((item) => item.startsWith('data:'));
    if (!line) {
      continue;
    }
    const payload = line.replace(/^data:\s?/, '');
    if (!payload) {
      continue;
    }
    try {
      events.push(JSON.parse(payload) as ComposeProgressEvent);
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, rest };
}

export async function composeWithProgress(
  body: { prompt: string; seed?: unknown },
  onProgress: (event: ComposeProgressEvent) => void
): Promise<ComposeStreamResult> {
  const response = await fetch('/api/compose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  const type = response.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const json: unknown = await response.json();
    if (
      typeof json === 'object' &&
      json !== null &&
      'ok' in json &&
      json.ok === true &&
      'url' in json &&
      typeof json.url === 'string'
    ) {
      return {
        ok: true,
        url: json.url,
        png: 'png' in json && typeof json.png === 'string' ? json.png : undefined,
        token: 'token' in json && typeof json.token === 'string' ? json.token : undefined,
        piece: 'piece' in json ? (json.piece as ClientPiece) : undefined,
      };
    }
    const error =
      typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Could not generate that chart';
    const pay =
      typeof json === 'object' &&
      json !== null &&
      'pay' in json &&
      json.pay === true;
    return { ok: false, error, pay: pay || response.status === 402 };
  }

  if (!response.ok || !response.body) {
    return { ok: false, error: 'Could not generate that chart' };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: ComposeStreamResult = { ok: false, error: 'Could not generate that chart' };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;

    for (const event of parsed.events) {
      onProgress(event);
      if (event.stage === 'done' && event.url) {
        result = {
          ok: true,
          url: event.url,
          png: event.png,
          token: event.token,
          piece: event.piece,
        };
      }
      if (event.stage === 'error') {
        result = {
          ok: false,
          error: event.error ?? 'Could not generate that chart',
          pay: event.pay,
        };
      }
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk(`${buffer}\n\n`);
    for (const event of parsed.events) {
      onProgress(event);
      if (event.stage === 'done' && event.url) {
        result = { ok: true, url: event.url, png: event.png, token: event.token, piece: event.piece };
      }
      if (event.stage === 'error') {
        result = {
          ok: false,
          error: event.error ?? 'Could not generate that chart',
          pay: event.pay,
        };
      }
    }
  }

  return result;
}
