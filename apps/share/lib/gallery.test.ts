import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { matchPrompt } from '@vizzy/resolve';
import { describe, expect, it } from 'vitest';
import { GalleryChartArticle } from '../app/components/GalleryChart';
import sitemap from '../app/sitemap';
import {
  GALLERY,
  GALLERY_TOPICS,
  galleryBySlug,
  galleryChartModel,
  galleryIndexUrls,
  isPublicGallerySlug,
} from './gallery';
import { siteUrl } from './site';

describe('public gallery', () => {
  it('seeds about 30 catalog series and stores no rows', () => {
    expect(GALLERY.length).toBeGreaterThanOrEqual(30);
    expect(GALLERY.length).toBeLessThanOrEqual(36);
    const slugs = new Set(GALLERY.map((chart) => chart.slug));
    expect(slugs.size).toBe(GALLERY.length);
    for (const chart of GALLERY) {
      expect(chart.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(chart).not.toHaveProperty('rows');
      expect(chart).not.toHaveProperty('data');
      const matched = matchPrompt(chart.prompt);
      expect(matched?.family, chart.slug).toBe(chart.family);
      expect(matched?.seriesId, chart.slug).toBe(chart.seriesId);
    }
    for (const topic of GALLERY_TOPICS) {
      expect(GALLERY.filter((chart) => chart.topic === topic.id).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('renders a seeded chart page with the title, the source, and JSON-LD', () => {
    const chart = galleryBySlug('us-unemployment-rate-since-2000');
    expect(chart).toBeTruthy();
    const model = galleryChartModel(
      chart!,
      {
        source: {
          label: 'FRED — U.S. unemployment rate',
          method: 'official',
          url: 'https://fred.stlouisfed.org/series/UNRATE',
          evidence: chart!.citation,
          retrieved: '2026-11-15',
        },
        updated: '2026-11-15',
      },
      'https://vizzy.run'
    );
    const html = renderToStaticMarkup(createElement(GalleryChartArticle, { model }));
    expect(html).toContain('US unemployment rate since 2000');
    expect(html).toContain('FRED — U.S. unemployment rate');
    expect(html).toContain('https://fred.stlouisfed.org/series/UNRATE');
    expect(html).toContain('Updated 2026-11-15');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Dataset"');
    expect(html).toContain('https://fred.stlouisfed.org/series/UNRATE');
    expect(html).toContain('Remix this chart');
    expect(html).toContain(`/charts/${chart!.slug}.png`);
    expect(decodeURIComponent(html)).toContain(`https://vizzy.run/charts/${chart!.slug}`);
    expect(decodeURIComponent(html)).not.toContain(`/c/${chart!.slug}`);
  });

  it('lists gallery pages in the sitemap and leaves private charts out', () => {
    const origin = siteUrl();
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual(expect.arrayContaining(galleryIndexUrls(origin)));
    const chartUrls = urls.filter((url) => url.includes('/charts/'));
    expect(chartUrls).toHaveLength(GALLERY.length);
    expect(isPublicGallerySlug('k7H3mQ9xAb12')).toBe(false);
    expect(isPublicGallerySlug('reef')).toBe(false);
    expect(urls.some((url) => url.includes('/charts/k7H3mQ9xAb12'))).toBe(false);
    expect(urls.some((url) => url.includes('/me'))).toBe(false);
    expect(urls.some((url) => url.includes('/c/x/'))).toBe(false);
  });
});
