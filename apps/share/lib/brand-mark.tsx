import { DUST, DUST_MID, STUDIO } from './theme';

export const PAPER = STUDIO.paper;
export const INK = STUDIO.ink;
export const MUTE = STUDIO.mute;

/** Three bars. Warm, cool, ink — the site rainbow, compressed so it still reads at 32px. */
export const MARK_BARS = [
  { tone: DUST_MID[0], height: 0.4 },
  { tone: DUST_MID[5], height: 0.68 },
  { tone: STUDIO.ink, height: 1 },
] as const;

export function BrandBars({
  width,
  height,
  gap,
}: {
  width: number;
  height: number;
  gap: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        width,
        height,
        gap,
      }}
    >
      {MARK_BARS.map((bar) => (
        <div
          key={bar.tone}
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            height: Math.max(2, Math.round(height * bar.height)),
            background: bar.tone,
          }}
        />
      ))}
    </div>
  );
}

export function BrandMark({ size, pad }: { size: number; pad?: number }) {
  const inset = Math.round(size * (pad ?? (size <= 32 ? 0.2 : 0.24)));
  const inner = Math.max(8, size - inset * 2);
  const ruleHeight = Math.max(2, Math.round(size * (size <= 32 ? 0.14 : 0.1)));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER,
        padding: inset,
      }}
    >
      <DustRule width={inner} height={ruleHeight} />
    </div>
  );
}

export function DustRule({ width, height = 4 }: { width: number; height?: number }) {
  const n = DUST.length;
  const gap = 3;
  const barW = (width - gap * (n - 1)) / n;
  return (
    <div style={{ display: 'flex', width, height, gap }}>
      {DUST.map((tone, index) => (
        <div
          key={tone}
          style={{
            width: barW,
            height,
            background: index === 6 ? INK : tone,
          }}
        />
      ))}
    </div>
  );
}
