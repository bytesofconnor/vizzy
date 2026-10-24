'use client';

import type { ComposeProgressEvent } from './compose-progress';
import { readComposeOutcome, type ComposeDisposition, type ComposeOutcome } from './compose-outcome';
import type { ChartSeed } from './seed';

export type ComposeCall = {
  prompt: string;
  seed?: ChartSeed;
  disposition?: ComposeDisposition;
};

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

function chartFromEvent(event: ComposeProgressEvent): ComposeOutcome | undefined {
  if (event.stage === 'done' && event.url) {
    return {
      kind: 'chart',
      url: event.url,
      ...(event.png ? { png: event.png } : {}),
      ...(event.token ? { token: event.token } : {}),
      ...(event.piece ? { piece: event.piece } : {}),
    };
  }
  if (event.stage === 'error') {
    return {
      kind: 'fail',
      error: event.error ?? 'Could not generate that chart',
      ...(event.pay ? { pay: true } : {}),
    };
  }
  return undefined;
}

export async function composeWithProgress(
  body: ComposeCall,
  onProgress: (event: ComposeProgressEvent) => void
): Promise<ComposeOutcome> {
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
    const outcome = readComposeOutcome(json);
    if (outcome.kind === 'fail' && response.status === 402) {
      return { kind: 'fail', error: outcome.error, pay: true };
    }
    return outcome;
  }

  if (!response.ok || !response.body) {
    return {
      kind: 'fail',
      error: 'Could not generate that chart',
      ...(response.status === 402 ? { pay: true } : {}),
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: ComposeOutcome = { kind: 'fail', error: 'Could not generate that chart' };

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
      const next = chartFromEvent(event);
      if (next) {
        result = next;
      }
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk(`${buffer}\n\n`);
    for (const event of parsed.events) {
      onProgress(event);
      const next = chartFromEvent(event);
      if (next) {
        result = next;
      }
    }
  }

  return result;
}
