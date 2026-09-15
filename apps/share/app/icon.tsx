import { ImageResponse } from 'next/og';
import { BrandMark } from '../lib/brand-mark';

export function generateImageMetadata() {
  return [
    { contentType: 'image/png', size: { width: 32, height: 32 }, id: '32' },
    { contentType: 'image/png', size: { width: 192, height: 192 }, id: '192' },
    { contentType: 'image/png', size: { width: 512, height: 512 }, id: '512' },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = Number(id) || 32;
  return new ImageResponse(<BrandMark size={size} pad={size <= 32 ? 0.18 : 0.22} />, {
    width: size,
    height: size,
  });
}
