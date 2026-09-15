import { ImageResponse } from 'next/og';
import { DustChart, PAPER } from '../lib/brand-mark';

export function generateImageMetadata() {
  return [
    { contentType: 'image/png', size: { width: 32, height: 32 }, id: '32' },
    { contentType: 'image/png', size: { width: 192, height: 192 }, id: '192' },
    { contentType: 'image/png', size: { width: 512, height: 512 }, id: '512' },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = Number(id) || 32;
  const inset = size >= 192 ? 0.22 : 0.16;
  const pad = Math.round(size * inset);
  const inner = size - pad * 2;
  const chartH = Math.round(inner * 0.72);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: PAPER,
          padding: pad,
        }}
      >
        <DustChart width={inner} height={chartH} gap={Math.max(2, Math.round(inner * 0.045))} />
      </div>
    ),
    { width: size, height: size }
  );
}
