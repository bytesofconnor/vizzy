import { describe, expect, it } from 'vitest';
import { freeChartsLeft } from '../../../convex/free-charts';
import { DEVICE_COOKIE, deviceIdFromCookie, readDeviceStamp, withDeviceCookie } from './device-allowance';

describe('free chart allowance', () => {
  it('stops when either the IP or the device has used the cap', () => {
    expect(freeChartsLeft(0, 0, 3)).toBe(3);
    expect(freeChartsLeft(2, 0, 3)).toBe(1);
    expect(freeChartsLeft(0, 3, 3)).toBe(0);
    expect(freeChartsLeft(3, 1, 3)).toBe(0);
  });
});

describe('device cookie', () => {
  it('keeps a valid id and mints one when the cookie is missing', () => {
    expect(deviceIdFromCookie(null)).toBeUndefined();
    expect(deviceIdFromCookie(`${DEVICE_COOKIE}=abc`)).toBeUndefined();
    const id = 'a'.repeat(32);
    expect(deviceIdFromCookie(`theme=light; ${DEVICE_COOKIE}=${id}`)).toBe(id);
    const first = readDeviceStamp(null);
    expect(first.fresh).toBe(true);
    expect(first.id).toMatch(/^[a-f0-9]{32}$/);
    expect(readDeviceStamp(`${DEVICE_COOKIE}=${id}`)).toEqual({ id, fresh: false });
  });

  it('sets the cookie only on a fresh device', async () => {
    const kept = withDeviceCookie(Response.json({ ok: true }), { id: 'a'.repeat(32), fresh: false });
    expect(kept.headers.get('set-cookie')).toBeNull();
    const minted = withDeviceCookie(Response.json({ ok: true }), { id: 'b'.repeat(32), fresh: true });
    expect(minted.headers.get('set-cookie')).toContain(`${DEVICE_COOKIE}=${'b'.repeat(32)}`);
    expect(await minted.json()).toEqual({ ok: true });
  });
});
