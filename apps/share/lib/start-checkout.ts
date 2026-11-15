import type { WriterInterval } from './writer-plan';

export async function startPackCheckout(): Promise<string> {
  const response = await fetch('/api/checkout', { method: 'POST' });
  return readCheckoutUrl(response);
}

export async function startWriterCheckout(interval: WriterInterval): Promise<string> {
  const response = await fetch('/api/checkout/writer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ interval }),
  });
  return readCheckoutUrl(response);
}

async function readCheckoutUrl(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string') {
    return body.url;
  }
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    throw new Error(body.error);
  }
  throw new Error('Could not start checkout');
}
