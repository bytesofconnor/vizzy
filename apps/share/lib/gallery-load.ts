import { gatherOfficialSeries } from './series';
import { mintFromOfficial } from './official-mint';
import type { Piece } from './pieces';
import { galleryBySlug, galleryTopicLabel, type GalleryChart } from './gallery';

const OK_MS = 60 * 60 * 1000;
const MISS_MS = 60 * 1000;

type CacheHit = { until: number; piece: Piece | null };

const cache = new Map<string, CacheHit>();
const inflight = new Map<string, Promise<Piece | null>>();

async function fetchGalleryPiece(chart: GalleryChart): Promise<Piece | null> {
  const gathered = await gatherOfficialSeries(chart.prompt);
  if (!gathered) {
    return null;
  }
  if (gathered.series.family !== chart.family || gathered.series.seriesId !== chart.seriesId) {
    return null;
  }
  const minted = mintFromOfficial(chart.prompt, gathered.series);
  if (!minted.ok) {
    return null;
  }
  const source = minted.piece.config.source;
  return {
    ...minted.piece,
    slug: chart.slug,
    kicker: galleryTopicLabel(chart.topic),
    title: chart.title,
    note: chart.description,
    config: {
      ...minted.piece.config,
      ...(source
        ? {
            source: {
              ...source,
              evidence: source.evidence || chart.citation,
            },
          }
        : {}),
      accessibility: {
        ...minted.piece.config.accessibility,
        title: chart.title,
        description: chart.description,
      },
    },
  };
}

export async function loadGalleryPiece(chart: GalleryChart): Promise<Piece | null> {
  const hit = cache.get(chart.slug);
  if (hit && hit.until > Date.now()) {
    return hit.piece;
  }
  const pending = inflight.get(chart.slug);
  if (pending) {
    return pending;
  }
  const run = fetchGalleryPiece(chart)
    .then((piece) => {
      cache.set(chart.slug, { until: Date.now() + (piece ? OK_MS : MISS_MS), piece });
      return piece;
    })
    .finally(() => {
      inflight.delete(chart.slug);
    });
  inflight.set(chart.slug, run);
  return run;
}

export async function loadGalleryPieceBySlug(slug: string): Promise<{ chart: GalleryChart; piece: Piece | null } | null> {
  const chart = galleryBySlug(slug);
  if (!chart) {
    return null;
  }
  const piece = await loadGalleryPiece(chart);
  return { chart, piece };
}
