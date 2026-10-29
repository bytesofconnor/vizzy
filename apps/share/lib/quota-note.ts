import { FREE_PER_DAY, PACK_CREDITS, PACK_PRICE_LABEL } from './pack';

export type QuotaSnapshot = {
  configured: boolean;
  canCompose: boolean;
  freeLeft: number;
  credits: number;
  unlimited?: boolean;
  justPaid?: boolean;
};

export type HomepageQuotaNote = {
  badge: string | null;
  status: string | null;
};

const PITCH = `${FREE_PER_DAY} free today, then ${PACK_PRICE_LABEL} for ${PACK_CREDITS}`;

export function homepageQuotaNote(quota: QuotaSnapshot | null): HomepageQuotaNote {
  const unlimited = Boolean(quota?.unlimited);
  const justPaid = Boolean(quota?.justPaid);
  let badge: string | null = null;
  if (quota?.configured) {
    if (quota.justPaid && quota.credits > 0) {
      badge = `${quota.credits} added`;
    } else if (quota.unlimited) {
      badge = 'Unlimited';
    } else if (quota.credits > 0) {
      badge = `${quota.credits} left`;
    } else if (quota.freeLeft > 0 && quota.freeLeft < FREE_PER_DAY) {
      badge = `${quota.freeLeft} free today`;
    } else if (quota.freeLeft <= 0) {
      badge = 'No free charts today';
    }
  }
  const status = unlimited || justPaid ? null : PITCH;
  return { badge, status };
}

export function homepageQuotaText(quota: QuotaSnapshot | null): string {
  const note = homepageQuotaNote(quota);
  return [note.badge, note.status].filter((part): part is string => Boolean(part)).join(' ');
}

export function composeNeedsPay(quota: QuotaSnapshot | null): boolean {
  if (!quota?.configured || quota.unlimited) {
    return false;
  }
  return !quota.canCompose;
}
