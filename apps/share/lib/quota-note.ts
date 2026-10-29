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
  if (!quota?.configured) {
    return { badge: null, status: PITCH };
  }
  if (quota.unlimited) {
    return { badge: 'Unlimited', status: null };
  }
  if (quota.justPaid) {
    return { badge: quota.credits > 0 ? `${quota.credits} added` : null, status: null };
  }
  const badge = quota.credits > 0 ? `${quota.credits} left` : null;
  if (quota.canCompose && quota.freeLeft > 0) {
    return {
      badge,
      status: `${quota.freeLeft} free today, then ${PACK_PRICE_LABEL} for ${PACK_CREDITS}`,
    };
  }
  if (quota.credits > 0) {
    return { badge, status: null };
  }
  return { badge: null, status: 'No free charts today' };
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
