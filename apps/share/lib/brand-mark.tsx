import { DUST, STUDIO } from './theme';

export const PAPER = STUDIO.paper;
export const INK = STUDIO.ink;
export const MUTE = STUDIO.mute;

const HEIGHTS = [0.42, 0.58, 0.31, 0.78, 0.48, 0.66, 0.92, 0.38] as const;

export function DustChart({
  width,
  height,
  gap = 6,
}: {
  width: number;
  height: number;
  gap?: number;
}) {
  const n = DUST.length;
  const barW = (width - gap * (n - 1)) / n;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        width,
        height,
        gap,
      }}
    >
      {DUST.map((tone, index) => (
        <div
          key={tone}
          style={{
            width: barW,
            height: Math.max(2, Math.round(height * (HEIGHTS[index] ?? 0.5))),
            background: index === 6 ? INK : tone,
          }}
        />
      ))}
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
