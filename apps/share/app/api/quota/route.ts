import { composeDevice, peekQuota, withDeviceCookie } from '../../../lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const device = composeDevice(request);
  try {
    return withDeviceCookie(
      Response.json(await peekQuota(request, device), {
        headers: { 'Cache-Control': 'no-store' },
      }),
      device
    );
  } catch (error) {
    console.error('quota peek failed', error);
    return withDeviceCookie(
      Response.json({ ok: false, error: 'Could not read quota' }, { status: 500 }),
      device
    );
  }
}
