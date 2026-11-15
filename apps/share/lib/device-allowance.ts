import { randomBytes } from 'node:crypto';

export const DEVICE_COOKIE = 'vizzy_device';

const DEVICE_ID = /^[a-f0-9]{32}$/;

export type DeviceStamp = {
  id: string;
  fresh: boolean;
};

export function deviceIdFromCookie(header: string | null | undefined): string | undefined {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0 || trimmed.slice(0, eq) !== DEVICE_COOKIE) {
      continue;
    }
    const raw = trimmed.slice(eq + 1);
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      value = raw;
    }
    if (DEVICE_ID.test(value)) {
      return value;
    }
  }
  return undefined;
}

export function readDeviceStamp(header: string | null | undefined): DeviceStamp {
  const existing = deviceIdFromCookie(header);
  if (existing) {
    return { id: existing, fresh: false };
  }
  return { id: randomBytes(16).toString('hex'), fresh: true };
}

export function deviceSetCookie(id: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const maxAge = 60 * 60 * 24 * 400;
  return `${DEVICE_COOKIE}=${id}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export function withDeviceCookie(response: Response, device: DeviceStamp): Response {
  if (!device.fresh) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', deviceSetCookie(device.id));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
