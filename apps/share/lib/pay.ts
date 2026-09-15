import { PACK_CREDITS, PACK_PRICE_LABEL } from './pack';

export function payMessage(): string {
  return `That's the free charts for today. ${PACK_PRICE_LABEL} for ${PACK_CREDITS} more.`;
}

export function payBody(error: string) {
  return {
    ok: false as const,
    error,
    pay: true,
    packCredits: PACK_CREDITS,
    packPriceLabel: PACK_PRICE_LABEL,
  };
}
