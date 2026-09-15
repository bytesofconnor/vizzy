import { ImageResponse } from 'next/og';
import { DustChart, DustRule, INK, MUTE, PAPER } from '../lib/brand-mark';

export const alt = 'Vizzy — A chart you can paste.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          color: INK,
          padding: '72px 80px 64px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: MUTE,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            Vizzy
          </div>
          <div style={{ display: 'flex', marginTop: 18 }}>
            <DustRule width={176} height={4} />
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 36,
              fontSize: 72,
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              maxWidth: 920,
              fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            }}
          >
            A chart you can paste.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontSize: 28,
              lineHeight: 1.35,
              color: MUTE,
              maxWidth: 720,
              fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            }}
          >
            Pull the data. Chart it. Paste it anywhere.
          </div>
        </div>
        <DustChart width={280} height={96} gap={8} />
      </div>
    ),
    size
  );
}
