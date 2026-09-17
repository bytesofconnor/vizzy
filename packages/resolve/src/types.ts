export type Family = 'fred' | 'noaa' | 'usgs' | 'wiki' | 'worldbank';

export type SeriesRow = {
  x: string;
  y: number;
};

export type Recipe = {
  family: Family;
  seriesId: string;
  sourceLabel: string;
  sourceUrl: string;
  xLabel: string;
  yLabel: string;
  match: (asked: string) => boolean;
};

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
