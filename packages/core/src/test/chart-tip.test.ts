import { describe, expect, it } from 'vitest';
import { chartTipText, formatTipNumber, bindChartTip, seriesTipLabel } from '../chart-tip';

describe('chartTipText', () => {
  it('joins a category and value', () => {
    expect(chartTipText({ title: 'Qatar', value: '5.0' })).toBe('Qatar: 5.0');
  });

  it('adds a series when it differs from the category', () => {
    expect(chartTipText({ title: '2019', value: '12', series: 'Starts' })).toBe('2019 · Starts: 12');
  });
});

describe('seriesTipLabel', () => {
  it('drops paint hexes used as a color field', () => {
    expect(seriesTipLabel('#121211')).toBeUndefined();
    expect(seriesTipLabel('India')).toBe('India');
  });
});

describe('formatTipNumber', () => {
  it('keeps a one-decimal stress score', () => {
    expect(formatTipNumber(4.8, [4, 6])).toBe('4.8');
  });
});

describe('bindChartTip', () => {
  it('shows the point label on mouseenter', () => {
    const root = document.createElement('div');
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    root.append(mark);
    document.body.append(root);
    bindChartTip(root, mark, () => ({ title: '2018', value: '8.7M' }));
    mark.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 24, bubbles: true }));
    const tip = root.querySelector('.vizzy-tip');
    expect(tip).toBeTruthy();
    expect(tip?.textContent).toBe('2018: 8.7M');
    expect((tip as HTMLDivElement).hidden).toBe(false);
    root.remove();
  });
});
