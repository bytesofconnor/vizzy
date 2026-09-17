import type { HttpGet } from './types';

export const RESOLVE_UA = 'Vizzy/1.0 (https://vizzy.run; public series resolve)';

export const defaultGet: HttpGet = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': RESOLVE_UA, Accept: 'text/plain, text/csv, application/json, text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`resolve fetch ${response.status}`);
  }
  return await response.text();
};
