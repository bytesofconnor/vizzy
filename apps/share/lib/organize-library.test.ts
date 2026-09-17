import { describe, expect, it } from 'vitest';
import { clusterByTitle, organizeLibrary, organizeSaved, uniqueBySlug } from './organize-library';

const noon = Date.UTC(2026, 8, 17, 12, 0, 0);

function row(
  slug: string,
  title: string,
  createdAt: number,
  extra?: Partial<{ route: 'compose' | 'publish'; pinned: boolean }>
) {
  return {
    slug,
    title,
    createdAt,
    route: extra?.route ?? 'compose',
    pinned: extra?.pinned,
  };
}

describe('organizeLibrary', () => {
  it('drops duplicate slugs and keeps the first (newest) row', () => {
    const rows = [
      row('a', 'Ozone', noon),
      row('a', 'Ozone older', noon - 1000),
      row('b', 'Vinyl', noon - 2000),
    ];
    expect(uniqueBySlug(rows).map((item) => item.slug)).toEqual(['a', 'b']);
  });

  it('clusters remixed titles and buckets by day', () => {
    const rows = [
      row('o1', 'Antarctic Ozone Hole Peak Area by Year', noon),
      row('o2', 'Antarctic Ozone Hole Peak Area by Year', noon - 60_000),
      row('v', 'US vinyl revenue since the revival', noon - 2 * 24 * 60 * 60 * 1000),
    ];
    const ozone = clusterByTitle(rows).find((cluster) => cluster.versions.length > 1);
    expect(ozone?.versions).toHaveLength(2);

    const buckets = organizeLibrary(rows, noon);
    expect(buckets.map((bucket) => bucket.label)).toEqual(['Today', 'This week']);
    expect(buckets[0]?.clusters[0]?.versions).toHaveLength(2);
  });
});

describe('organizeSaved', () => {
  it('groups unique saves by date and does not dump every title in one list', () => {
    const groups = organizeSaved(
      [
        row('vinyl', 'US vinyl revenue since the revival', noon),
        row('tigers', 'Wild tiger population by country today', noon - 60_000),
        row('fruit', 'Most consumed fruits', noon - 10 * 24 * 60 * 60 * 1000, { route: 'publish' }),
      ],
      noon
    );
    expect(groups.map((group) => group.label)).toEqual(['Today', 'This month']);
    expect(groups[0]?.rows).toHaveLength(2);

    const byRoute = organizeSaved(
      [
        row('vinyl', 'US vinyl', noon),
        row('api', 'From an agent', noon, { route: 'publish' }),
      ],
      noon,
      'route'
    );
    expect(byRoute.map((group) => group.label)).toEqual(['You typed', 'An agent']);
  });
});
