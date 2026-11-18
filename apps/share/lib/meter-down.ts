import { FREE_PER_DAY } from './pack';
import type { ConsumeResult } from './billing';

/** Convex redacts a failed billing call to "Server Error". An empty Convex errorMessage becomes "Convex call failed". */
export function openSlotWhenMeterDown(error: unknown): ConsumeResult | null {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (!/Server Error|Convex call failed/i.test(message)) {
    return null;
  }
  return { ok: true, via: 'open', freeLeft: FREE_PER_DAY, credits: 0 };
}
