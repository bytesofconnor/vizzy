import { describe, expect, it } from 'vitest';
import { sanitizeLesson } from './chart-insight';

describe('sanitizeLesson', () => {
  it('keeps a complete closer look', () => {
    const lesson = sanitizeLesson({
      notice: 'Permits sit well above starts in the latest month.',
      teach:
        'Builders pull permits before they break ground, so a gap often means projects are queued rather than finished.\n\nRead the two bars as a sequence, not a contest: the right-hand series is the later step.',
      question: 'If starts caught up to permits next month, what would that imply?',
      tryNext: 'Add the monthly series for the last five years as a line.',
    });
    expect(lesson?.notice).toMatch(/Permits/);
    expect(lesson?.tryNext.startsWith('Add')).toBe(true);
  });

  it('drops a thin lesson', () => {
    expect(
      sanitizeLesson({
        notice: 'Hi',
        teach: 'Too short',
        question: 'Why?',
        tryNext: 'More',
      })
    ).toBeNull();
  });
});
