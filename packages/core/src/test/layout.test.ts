import { describe, expect, it } from 'vitest';
import { xAxisRoom, xTickRotate, shortCategoryNames } from '../layout';

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
    const room = xAxisRoom(names, { hasTitle: true, innerWidth: 640 });
    expect(xTickRotate(names, 640)).toBe(-65);
    expect(room.titleY).toBeGreaterThan(room.tickDepth);
    expect(room.bottom).toBeGreaterThan(room.titleY);
    expect(room.tickDepth).toBeGreaterThan(100);
  });

  it('does not rotate a short named set', () => {
    const names = ['August Schell', 'Summit', 'Surly'];
    expect(xTickRotate(names, 420)).toBe(0);
    expect(xAxisRoom(names, { hasTitle: true, innerWidth: 420 }).rotate).toBe(0);
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
    expect(room.tickDepth).toBeLessThan(90);
  });
});
