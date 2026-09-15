import { ImageResponse } from 'next/og';
import { DustChart, PAPER } from '../lib/brand-mark';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const pad = 36;
  const inner = 180 - pad * 2;
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: PAPER,
          padding: pad,
        }}
      >
        <DustChart width={inner} height={Math.round(inner * 0.72)} gap={5} />
      </div>
    ),
    size
  );
}
