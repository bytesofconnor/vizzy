import { DATASETS, type Family } from '@vizzy/resolve';
import { CARD } from './compose';
import { remixPrompt } from './remix-prompt';
import type { ChartSource } from './source';
import { sourceMethodFor } from './source';

export const GALLERY_TOPICS = [
  { id: 'economy', label: 'Economy' },
  { id: 'climate', label: 'Climate' },
  { id: 'energy', label: 'Energy' },
  { id: 'demographics', label: 'Demographics' },
  { id: 'markets', label: 'Markets' },
] as const;

export type GalleryTopicId = (typeof GALLERY_TOPICS)[number]['id'];

export type GalleryChart = {
  slug: string;
  title: string;
  description: string;
  topic: GalleryTopicId;
  prompt: string;
  family: Family;
  seriesId: string;
  citation: string;
};

export const GALLERY: readonly GalleryChart[] = [
  {
    slug: 'us-unemployment-rate-since-2000',
    title: 'US unemployment rate since 2000',
    description: 'The share of the US labor force that is unemployed, from 2000 to the latest month.',
    topic: 'economy',
    prompt: 'US unemployment rate since 2000',
    family: 'fred',
    seriesId: 'UNRATE',
    citation: 'Seasonally adjusted civilian unemployment rate.',
  },
  {
    slug: 'us-real-gdp-since-2000',
    title: 'US real GDP since 2000',
    description: 'US real gross domestic product since 2000, in billions of dollars, one year at a time.',
    topic: 'economy',
    prompt: 'US GDP since 2000',
    family: 'fred',
    seriesId: 'GDPCA',
    citation: 'Real GDP, chained dollars, annual.',
  },
  {
    slug: 'us-cpi-inflation',
    title: 'US CPI inflation',
    description: 'The US consumer price index over the last five years.',
    topic: 'economy',
    prompt: 'US CPI inflation',
    family: 'fred',
    seriesId: 'CPIAUCSL',
    citation: 'Consumer price index for all urban consumers.',
  },
  {
    slug: 'us-federal-funds-rate-since-2020',
    title: 'US federal funds rate since 2020',
    description: 'The US federal funds rate since 2020.',
    topic: 'economy',
    prompt: 'US federal funds rate since 2020',
    family: 'fred',
    seriesId: 'FEDFUNDS',
    citation: 'Effective federal funds rate.',
  },
  {
    slug: 'us-housing-starts',
    title: 'US housing starts',
    description: 'New privately owned housing starts in the United States.',
    topic: 'economy',
    prompt: 'US housing starts',
    family: 'fred',
    seriesId: 'HOUST',
    citation: 'Housing starts, thousands of units.',
  },
  {
    slug: 'us-median-home-price',
    title: 'US median home price',
    description: 'The median sales price of houses sold in the United States.',
    topic: 'economy',
    prompt: 'US median home price',
    family: 'fred',
    seriesId: 'MSPUS',
    citation: 'Median sales price of houses sold.',
  },
  {
    slug: 'coffee-prices',
    title: 'Coffee prices',
    description: 'The IMF price for other mild Arabica coffee, in US cents per pound.',
    topic: 'economy',
    prompt: 'coffee prices',
    family: 'fred',
    seriesId: 'PCOFFOTMUSDM',
    citation: 'Other mild Arabica, US cents per pound.',
  },
  {
    slug: 'share-in-extreme-poverty',
    title: 'Share of the world in extreme poverty',
    description: 'The share of the world population living in extreme poverty.',
    topic: 'economy',
    prompt: 'extreme poverty',
    family: 'owid',
    seriesId: 'extreme_poverty',
    citation: 'Share of population living in extreme poverty.',
  },
  {
    slug: 'gdp-per-capita-us-china-india',
    title: 'GDP per capita in the US, China, and India',
    description: 'GDP per person in the United States, China, and India.',
    topic: 'economy',
    prompt: 'GDP per capita, United States vs China vs India',
    family: 'worldbank',
    seriesId: 'NY.GDP.PCAP.CD',
    citation: 'GDP per capita, current US dollars.',
  },
  {
    slug: 'youth-unemployment',
    title: 'Youth unemployment',
    description: 'Youth unemployment for the countries with the highest rates.',
    topic: 'economy',
    prompt: 'youth unemployment',
    family: 'worldbank',
    seriesId: 'SL.UEM.1524.ZS',
    citation: 'Unemployment, ages 15 to 24.',
  },
  {
    slug: 'global-temperature-anomaly',
    title: 'Global temperature anomaly',
    description: 'Global average temperature compared with the late nineteenth century.',
    topic: 'climate',
    prompt: 'global temperature anomaly',
    family: 'owid',
    seriesId: 'temperature_anomaly',
    citation: 'Global mean temperature anomaly.',
  },
  {
    slug: 'mauna-loa-co2',
    title: 'Mauna Loa atmospheric CO2',
    description: 'Annual mean carbon dioxide at Mauna Loa, in parts per million.',
    topic: 'climate',
    prompt: 'Mauna Loa atmospheric CO2',
    family: 'noaa',
    seriesId: 'co2_annmean_mlo',
    citation: 'Mauna Loa annual mean CO2.',
  },
  {
    slug: 'atmospheric-methane',
    title: 'Global atmospheric methane',
    description: 'Global annual mean atmospheric methane.',
    topic: 'climate',
    prompt: 'atmospheric methane',
    family: 'noaa',
    seriesId: 'ch4_annmean_gl',
    citation: 'Global annual mean methane.',
  },
  {
    slug: 'arctic-sea-ice',
    title: 'Arctic sea ice',
    description: 'Arctic sea ice extent at the September minimum.',
    topic: 'climate',
    prompt: 'arctic sea ice',
    family: 'owid',
    seriesId: 'arctic_sea_ice',
    citation: 'September minimum extent.',
  },
  {
    slug: 'antarctic-sea-ice',
    title: 'Antarctic sea ice',
    description: 'Antarctic sea ice extent at the February minimum.',
    topic: 'climate',
    prompt: 'antarctic sea ice',
    family: 'owid',
    seriesId: 'antarctic_sea_ice',
    citation: 'February minimum extent.',
  },
  {
    slug: 'antarctic-ozone-hole',
    title: 'Antarctic ozone hole',
    description: 'Peak area of the Antarctic ozone hole each year.',
    topic: 'climate',
    prompt: 'antarctic ozone hole',
    family: 'noaa',
    seriesId: 'ozone_hole_area',
    citation: 'Maximum ozone hole area.',
  },
  {
    slug: 'us-wildfire-area',
    title: 'US wildfire area',
    description: 'Area burned by wildfires in the United States.',
    topic: 'climate',
    prompt: 'US wildfire area',
    family: 'owid',
    seriesId: 'us_wildfire_area',
    citation: 'Annual area burnt by wildfires in the United States.',
  },
  {
    slug: 'renewable-electricity-germany-france',
    title: 'Renewable electricity in Germany and France',
    description: 'Renewable electricity as a share of generation in Germany and France.',
    topic: 'energy',
    prompt: 'share of renewable electricity in Germany vs France',
    family: 'worldbank',
    seriesId: 'EG.ELC.RNEW.ZS',
    citation: 'Renewable electricity output as a share of total electricity.',
  },
  {
    slug: 'access-to-electricity',
    title: 'Access to electricity',
    description: 'Countries where the smallest share of people have electricity.',
    topic: 'energy',
    prompt: 'access to electricity',
    family: 'worldbank',
    seriesId: 'EG.ELC.ACCS.ZS',
    citation: 'Access to electricity, percent of population.',
  },
  {
    slug: 'oil-production',
    title: 'Oil production',
    description: 'Oil production for the top producing countries.',
    topic: 'energy',
    prompt: 'oil production',
    family: 'owid',
    seriesId: 'oil_production',
    citation: 'Oil production by country.',
  },
  {
    slug: 'electric-share-of-new-cars',
    title: 'Electric share of new cars',
    description: 'Electric cars as a share of new car sales, for the leading countries.',
    topic: 'energy',
    prompt: 'electric share of new cars',
    family: 'owid',
    seriesId: 'ev_share',
    citation: 'Electric share of new car sales.',
  },
  {
    slug: 'lithium-production',
    title: 'Lithium production',
    description: 'Lithium mine production for the top producing countries.',
    topic: 'energy',
    prompt: 'lithium mine production',
    family: 'owid',
    seriesId: 'lithium_production',
    citation: 'Lithium mine production by country.',
  },
  {
    slug: 'life-expectancy-japan-us-nigeria',
    title: 'Life expectancy in Japan, the US, and Nigeria',
    description: 'Life expectancy at birth in Japan, the United States, and Nigeria.',
    topic: 'demographics',
    prompt: 'life expectancy in Japan, the United States, and Nigeria',
    family: 'worldbank',
    seriesId: 'SP.DYN.LE00.IN',
    citation: 'Life expectancy at birth, years.',
  },
  {
    slug: 'fertility-rate',
    title: 'Fertility rate',
    description: 'Births per woman in the countries with the highest rates.',
    topic: 'demographics',
    prompt: 'fertility rate',
    family: 'worldbank',
    seriesId: 'SP.DYN.TFRT.IN',
    citation: 'Fertility rate, births per woman.',
  },
  {
    slug: 'population-aged-65',
    title: 'Population aged 65 and older',
    description: 'Share of the population aged 65 and older, highest countries.',
    topic: 'demographics',
    prompt: 'population aged 65',
    family: 'worldbank',
    seriesId: 'SP.POP.65UP.TO.ZS',
    citation: 'Population ages 65 and older, percent of total.',
  },
  {
    slug: 'world-population',
    title: 'World population',
    description: 'World population over the published record.',
    topic: 'demographics',
    prompt: 'world population',
    family: 'owid',
    seriesId: 'world_population',
    citation: 'World population.',
  },
  {
    slug: 'urban-population',
    title: 'Urban population',
    description: 'Share of the world population living in cities.',
    topic: 'demographics',
    prompt: 'urban population',
    family: 'owid',
    seriesId: 'urban_share',
    citation: 'Share of the population living in urban areas.',
  },
  {
    slug: 'child-mortality',
    title: 'Child mortality',
    description: 'Deaths before age five per 100 births.',
    topic: 'demographics',
    prompt: 'child mortality',
    family: 'owid',
    seriesId: 'child_mortality',
    citation: 'Under-five mortality.',
  },
  {
    slug: 'sp-500-last-20-years',
    title: 'S&P 500 over the last 20 years',
    description: 'The S&P 500 index over the last 20 years, one monthly close.',
    topic: 'markets',
    prompt: 'S&P 500 last 20 years',
    family: 'fred',
    seriesId: 'SP500',
    citation: 'S&P 500 index, monthly close.',
  },
  {
    slug: 'bitcoin-price-last-5-years',
    title: 'Bitcoin price over the last 5 years',
    description: 'The Coinbase bitcoin price over the last five years, one monthly close.',
    topic: 'markets',
    prompt: 'bitcoin price last 5 years',
    family: 'fred',
    seriesId: 'CBBTCUSD',
    citation: 'Coinbase bitcoin price in US dollars, monthly close.',
  },
  {
    slug: 'gold-reserves',
    title: 'Official gold reserves',
    description: 'Official gold reserves for the countries with the largest holdings.',
    topic: 'markets',
    prompt: 'gold reserves',
    family: 'wiki',
    seriesId: 'gold_reserves',
    citation: 'Official gold reserves, tonnes.',
  },
  {
    slug: 'case-shiller-home-price',
    title: 'Case-Shiller US home price index',
    description: 'The S&P Case-Shiller US national home price index.',
    topic: 'markets',
    prompt: 'Case-Shiller home price index',
    family: 'fred',
    seriesId: 'CSUSHPINSA',
    citation: 'S&P Case-Shiller US national home price index.',
  },
];

const BY_SLUG = new Map(GALLERY.map((chart) => [chart.slug, chart]));

export function galleryTopicLabel(topic: GalleryTopicId): string {
  return GALLERY_TOPICS.find((item) => item.id === topic)?.label ?? topic;
}

export function galleryBySlug(slug: string): GalleryChart | undefined {
  return BY_SLUG.get(slug);
}

export function isPublicGallerySlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function galleryIndexUrls(origin: string): string[] {
  const root = origin.replace(/\/$/, '');
  return [`${root}/gallery`, ...GALLERY.map((chart) => `${root}/charts/${chart.slug}`)];
}

export function relatedGalleryCharts(chart: GalleryChart, limit = 3): GalleryChart[] {
  return GALLERY.filter((item) => item.topic === chart.topic && item.slug !== chart.slug).slice(0, limit);
}

export function galleryChartsByTopic(): Array<{ id: GalleryTopicId; label: string; charts: GalleryChart[] }> {
  return GALLERY_TOPICS.map((topic) => ({
    id: topic.id,
    label: topic.label,
    charts: GALLERY.filter((chart) => chart.topic === topic.id),
  }));
}

function catalogSource(chart: GalleryChart): ChartSource {
  const dataset = DATASETS.find((item) => item.family === chart.family && item.seriesId === chart.seriesId);
  const url = dataset?.sourceUrl;
  return {
    label: dataset?.sourceLabel ?? chart.title,
    method: sourceMethodFor(url, 'official'),
    ...(url ? { url } : {}),
    evidence: chart.citation,
  };
}

export type GalleryDraw = {
  source: ChartSource;
  updated: string | null;
};

export type GalleryChartModel = {
  slug: string;
  title: string;
  description: string;
  topicLabel: string;
  source: ChartSource;
  updated: string | null;
  imagePath: string | null;
  imageWidth: number;
  imageHeight: number;
  related: Array<{ slug: string; title: string }>;
  remixHref: string;
  canonicalPath: string;
  jsonLd: Record<string, unknown>;
};

export function galleryChartModel(chart: GalleryChart, draw: GalleryDraw | null, origin: string): GalleryChartModel {
  const root = origin.replace(/\/$/, '');
  const source = draw
    ? {
        ...draw.source,
        evidence: draw.source.evidence || chart.citation,
      }
    : catalogSource(chart);
  const pageUrl = `${root}/charts/${chart.slug}`;
  const imageUrl = `${pageUrl}.png`;
  const ready = Boolean(draw);
  const remixText = remixPrompt(
    {
      slug: chart.slug,
      title: chart.title,
      note: chart.description,
      config: { source },
    },
    root,
    `/charts/${chart.slug}`
  );
  return {
    slug: chart.slug,
    title: chart.title,
    description: chart.description,
    topicLabel: galleryTopicLabel(chart.topic),
    source,
    updated: draw?.updated ?? null,
    imagePath: ready ? `/charts/${chart.slug}.png` : null,
    imageWidth: CARD.width,
    imageHeight: CARD.height,
    related: relatedGalleryCharts(chart).map((item) => ({ slug: item.slug, title: item.title })),
    remixHref: `/?prompt=${encodeURIComponent(remixText)}#prompt`,
    canonicalPath: `/charts/${chart.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: chart.title,
      description: chart.description,
      url: pageUrl,
      creator: { '@type': 'Organization', name: 'vizzy' },
      isAccessibleForFree: true,
      ...(draw?.updated ? { dateModified: draw.updated } : {}),
      citation: {
        '@type': 'CreativeWork',
        name: source.label,
        ...(source.url ? { url: source.url } : {}),
      },
      ...(ready
        ? {
            image: {
              '@type': 'ImageObject',
              url: imageUrl,
              width: CARD.width,
              height: CARD.height,
            },
          }
        : {}),
    },
  };
}
