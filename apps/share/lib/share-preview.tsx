import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { INK, MUTE, PAPER } from './brand-mark';
import type { Piece } from './pieces';
import { renderChartPng } from './render-piece';
import {
  SHARE_MARK_LABEL,
  SHARE_PREVIEW_HEIGHT,
  SHARE_PREVIEW_WIDTH,
  shareChannel,
} from './share-channel';
import { DUST_MID, STUDIO } from './theme';

function fontFile(file: string): Buffer {
  const candidates = [
    path.join(process.cwd(), 'fonts', file),
    path.join(process.cwd(), 'apps/share/fonts', file),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`${file} not found. Tried: ${candidates.join(', ')}`);
  }
  return fs.readFileSync(found);
}

export async function renderSharePreview(piece: Piece, origin = 'https://vizzy.run') {
  const channel = shareChannel(piece, { origin });
  const chart = await renderChartPng(piece, 1088, 360);
  const natural = { width: chart.readUInt32BE(16), height: chart.readUInt32BE(20) };
  const scale = Math.min(1096 / natural.width, 360 / natural.height);
  const chartWidth = Math.max(1, Math.round(natural.width * scale));
  const chartHeight = Math.max(1, Math.round(natural.height * scale));
  const src = `data:image/png;base64,${chart.toString('base64')}`;
  const archivo = fontFile('Archivo-Regular.ttf');
  const mono = fontFile('IBMPlexMono-Regular.ttf');
  return new ImageResponse(
    (
      <div
        style={{
          width: SHARE_PREVIEW_WIDTH,
          height: SHARE_PREVIEW_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          background: PAPER,
          color: INK,
          padding: '44px 52px 40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                width: 22,
                height: 16,
                marginRight: 10,
              }}
            >
              <div style={{ display: 'flex', width: 5, height: 7, background: DUST_MID[1], marginRight: 3 }} />
              <div style={{ display: 'flex', width: 5, height: 11, background: DUST_MID[5], marginRight: 3 }} />
              <div style={{ display: 'flex', width: 5, height: 16, background: STUDIO.ink }} />
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'IBM Plex Mono',
                fontSize: 18,
                color: MUTE,
              }}
            >
              {SHARE_MARK_LABEL}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'IBM Plex Mono',
              fontSize: 18,
              color: MUTE,
              maxWidth: 640,
            }}
          >
            {channel.preview.source}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 18,
            fontFamily: 'Archivo',
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            lineHeight: 1.12,
            maxHeight: 96,
            overflow: 'hidden',
          }}
        >
          {channel.preview.title}
        </div>
        <div style={{ display: 'flex', marginTop: 22 }}>
          <img src={src} width={chartWidth} height={chartHeight} />
        </div>
      </div>
    ),
    {
      width: SHARE_PREVIEW_WIDTH,
      height: SHARE_PREVIEW_HEIGHT,
      fonts: [
        { name: 'Archivo', data: archivo, weight: 400, style: 'normal' },
        { name: 'IBM Plex Mono', data: mono, weight: 400, style: 'normal' },
      ],
    }
  );
}
