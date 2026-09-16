import { describe, expect, it } from 'vitest';
import {
  fallbackEntitiesFromAsk,
  isGenericPlaceholderX,
  mostlyGenericPlaceholders,
  relabelGenericCategories,
} from './category-labels';

describe('category-labels', () => {
  it('flags Country A style placeholders', () => {
    expect(isGenericPlaceholderX('Country A')).toBe(true);
    expect(isGenericPlaceholderX('Country N')).toBe(true);
    expect(isGenericPlaceholderX('Team 3')).toBe(true);
    expect(isGenericPlaceholderX('Japan')).toBe(false);
    expect(isGenericPlaceholderX('2024')).toBe(false);
  });

  it('detects mostly placeholder rows', () => {
    const rows = [
      { x: 'Country A', y: 1 },
      { x: 'Country B', y: 2 },
      { x: 'Country C', y: 3 },
      { x: 'Japan', y: 4 },
    ];
    expect(mostlyGenericPlaceholders(rows)).toBe(true);
  });

  it('relabels placeholders with real countries from the ask', () => {
    const rows = [
      { x: 'Country A', y: 15 },
      { x: 'Country B', y: 13 },
      { x: 'Country C', y: 12 },
    ];
    const next = relabelGenericCategories(rows, [], 'life expectancy by country since 2000');
    expect(next.map((row) => row.x)).toEqual(['Japan', 'Spain', 'Brazil']);
    expect(next.map((row) => row.y)).toEqual([15, 13, 12]);
  });

  it('prefers names parsed from lookup notes', () => {
    const rows = [
      { x: 'Country A', y: 1 },
      { x: 'Country B', y: 2 },
    ];
    const next = relabelGenericCategories(rows, ['Norway', 'Kenya'], 'countries');
    expect(next.map((row) => row.x)).toEqual(['Norway', 'Kenya']);
  });

  it('picks country fallbacks for country prompts', () => {
    const names = fallbackEntitiesFromAsk('GDP per capita by country', 4);
    expect(names).toEqual(['Japan', 'Spain', 'Brazil', 'Nigeria']);
  });
});
