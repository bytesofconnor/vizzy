import { describe, expect, it } from 'vitest';
import { chartPath } from './chart-address';

describe('chartPath', () => {
  it('keeps the paste path Share copies', () => {
    expect(chartPath('https://vizzy.run/c/abc123')).toBe('/c/abc123');
    expect(chartPath('https://vizzy.run/c/x/token')).toBe('/c/x/token');
    expect(chartPath('https://vizzy.run/')).toBeNull();
    expect(chartPath('not a url')).toBeNull();
  });
});
