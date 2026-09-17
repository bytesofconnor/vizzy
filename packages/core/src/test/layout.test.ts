import { describe, expect, it } from 'vitest';
import {
  compactAxisLabel,
  looksSequentialX,
  xAxisRoom,
  xTickRotate,
  shortCategoryNames,
} from '../layout';

describe('xAxisRoom', () => {
  it('rotates crowded named categories and parks the title below them', () => {
    const names = [
      'Claude Code',
      'GitHub Copilot',
      'OpenAI Codex',
      'Cursor',
      'JetBrains AI/Junie',
      'OpenCode',
      'Google Antigravity',
    ];
    const room = xAxisRoom(names, { hasTitle: true, innerWidth: 360 });
    expect(xTickRotate(names, 360)).toBe(-65);
    expect(room.titleY).toBeGreaterThan(room.tickDepth);
    expect(room.bottom).toBeGreaterThan(room.titleY);
    expect(room.tickDepth).toBeGreaterThan(100);
  });

  it('treats fiscal-year lines as sequential and compacts their labels', () => {
    const years = ['2019/20', '2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];
    expect(looksSequentialX(years)).toBe(true);
    expect(compactAxisLabel('2019/20')).toBe('19/20');
    expect(xTickRotate(years, 320)).toBe(0);
  });

  it('does not rotate a short named set', () => {
    const names = ['August Schell', 'Summit', 'Surly'];
    expect(xTickRotate(names, 420)).toBe(0);
    expect(xAxisRoom(names, { hasTitle: true, innerWidth: 420 }).rotate).toBe(0);
  });

  it('keeps long source labels inside the plot at phone and desktop widths', () => {
    const names = [
      '(1979-2025) NOAA',
      '(1979-2025) NSIDC',
      '(since 1979) EEA',
      '(since 1979) NIPR',
    ];
    const phone = xAxisRoom(names, { hasTitle: true, innerWidth: 280 });
    const desktop = xAxisRoom(names, { hasTitle: true, innerWidth: 720 });
    expect(Math.max(phone.bottom, desktop.bottom)).toBeGreaterThan(90);
    expect(phone.bottom).toBeGreaterThanOrEqual(desktop.bottom - 8);
  });

  it('labels a crowded people set by last name', () => {
    const names = [
      'Alan Shearer',
      'Harry Kane',
      'Wayne Rooney',
      'Andy Cole',
      'Sergio Agüero',
      'Frank Lampard',
      'Thierry Henry',
      'Robbie Fowler',
      'Jermain Defoe',
      'Mohamed Salah',
      'Michael Owen',
      'Les Ferdinand',
      'Teddy Sheringham',
      'Robin van Persie',
      'Jamie Vardy',
    ];
    expect(shortCategoryNames(names)).toContain('Shearer');
    expect(shortCategoryNames(names)).toContain('van Persie');
    expect(shortCategoryNames(names)).not.toContain('Alan Shearer');
    const room = xAxisRoom(names, { hasTitle: true, innerWidth: 720 });
    expect(room.rotate).not.toBe(0);
    expect(room.tickDepth).toBeLessThan(110);
  });
});
