import { describe, expect, it } from 'vitest';
import { applyPrintGrayscale, isGrayscaleOnlyRevision, wantsPrintGrayscale } from './print-grayscale';
import { studioChart } from './theme';

describe('wantsPrintGrayscale', () => {
  it('matches the revision chip copy', () => {
    expect(wantsPrintGrayscale('Make it grayscale for print.')).toBe(true);
  });

  it('matches common phrasing', () => {
    expect(wantsPrintGrayscale('Use monochrome for the newsletter')).toBe(true);
  });

  it('ignores unrelated revisions', () => {
    expect(wantsPrintGrayscale('Sort by value.')).toBe(false);
  });
});

describe('isGrayscaleOnlyRevision', () => {
  it('is true for the chip alone', () => {
    expect(isGrayscaleOnlyRevision('Make it grayscale for print.')).toBe(true);
  });

  it('is false when data changes are also requested', () => {
    expect(isGrayscaleOnlyRevision('Make it grayscale for print and drop the bottom three.')).toBe(false);
  });
});

describe('applyPrintGrayscale', () => {
  it('replaces tone colors with an ink-to-paper ramp', () => {
    const config = studioChart({ type: 'bar' }, { x: 'x', y: 'y', color: 'tone' });
    const data = [
      { x: 'A', y: 1, tone: '#918380' },
      { x: 'B', y: 2, tone: '#818891' },
    ];
    const { config: next, data: rows } = applyPrintGrayscale(config, data);
    expect(next.colors.palette.every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
    expect(rows[0]?.tone).not.toBe('#918380');
    expect(rows[0]?.tone).toMatch(/^#/);
  });
});
