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
  const inset = Math.round(size * (pad ?? (size <= 32 ? 0.16 : 0.22)));
  const inner = Math.max(8, size - inset * 2);
  const gap = Math.max(size <= 32 ? 2 : 3, Math.round(inner * (size <= 32 ? 0.1 : 0.16)));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: PAPER,
        padding: inset,
      }}
    >
      <BrandBars width={inner} height={inner} gap={gap} />
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
