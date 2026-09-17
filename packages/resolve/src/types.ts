export type Family = 'fred' | 'noaa' | 'owid' | 'usgs' | 'wiki' | 'worldbank';

export type DatasetTopic =
  | 'biology'
  | 'chemistry'
  | 'climate'
  | 'demography'
  | 'ecology'
  | 'economy'
  | 'energy'
  | 'geography'
  | 'geopolitics'
  | 'history'
  | 'physics'
  | 'tech';

export type SeriesRow = {
  x: string;
  y: number;
};

/** A fetchable official series. Matching is retrieval over aliases, not a per-chart predicate. */
export type Dataset = {
  family: Family;
  seriesId: string;
  sourceLabel: string;
  sourceUrl: string;
  xLabel: string;
  yLabel: string;
  topics: readonly DatasetTopic[];
  aliases: readonly string[];
  avoid?: readonly string[];
};

export type Recipe = Dataset;

export type ResolvedSeries = {
  family: Family;
  seriesId: string;
  sourceLabel: string;
  sourceUrl: string;
  method: 'official';
  retrieved: number;
  xLabel: string;
  yLabel: string;
  rows: SeriesRow[];
};

export type HttpGet = (url: string) => Promise<string>;
