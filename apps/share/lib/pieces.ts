import { ChartConfig, DataPoint } from '@vizzy/core';
import { DUST, DUST_MID, STUDIO, studioChart } from './theme';

export interface Piece {
  slug: string;
  kicker: string;
  title: string;
  note: string;
  insight?: string;
  printGrayscale?: boolean;
  config: ChartConfig;
  data: DataPoint[];
}

export const PIECES: Piece[] = [
  {
    slug: 'reef',
    kicker: 'Coral reef health',
    title: 'Great Barrier Reef hard coral cover by sector',
    note: 'AIMS monitoring. The south fell fastest; the north held up longer, then slipped too.',
    insight:
      'Hard coral cover is a blunt but useful pulse check: it tracks how much living reef skeleton is still growing on the seafloor. A single bad bleaching summer can shave off a decade of recovery in one year.\n\nThe regional split matters. Northern reefs often bounce back faster after heat stress, while southern sites can look stable for years and then break in one survey cycle. The recent southern plunge — with central and northern lines bending down after — is the pattern AIMS warns about when heat stacks on crown-of-thorns outbreaks. Treat the last points as provisional until the next published survey confirms them.',
    config: studioChart(
      {
        type: 'line',
        curve: 'linear',
        strokeWidth: 1.5,
        showPoints: true,
        pointRadius: 3,
        area: false,
      },
      { x: 'year', y: 'cover', color: 'sector' },
      {
        legend: {
          show: true,
          position: 'top',
          orientation: 'horizontal',
          symbolSize: 10,
          itemSpacing: 8,
        },
        dimensions: {
          margin: { top: 56, right: 40, bottom: 96, left: 70 },
        },
        axes: {
          x: { show: true, grid: false, label: 'Year' },
          y: {
            show: true,
            grid: true,
            gridOpacity: 0.55,
            tickCount: 5,
            domain: [18, 42],
            label: 'Hard coral cover, %',
          },
        },
        source: {
          label: 'AIMS Long-Term Monitoring',
          method: 'official',
          url: 'https://www.aims.gov.au/monitoring/gbr-condition',
          retrieved: '2025-09',
          evidence: 'Northern, Central, and Southern GBR sectors, published survey years',
        },
        accessibility: {
          title: 'Great Barrier Reef hard coral cover by sector',
          description:
            'AIMS monitoring. The south fell fastest; the north held up longer, then slipped too.',
        },
      }
    ),
    data: [
      { year: '2019/20', cover: 35.8, sector: 'Northern' },
      { year: '2020/21', cover: 34.2, sector: 'Northern' },
      { year: '2021/22', cover: 33.1, sector: 'Northern' },
      { year: '2022/23', cover: 32.5, sector: 'Northern' },
      { year: '2023/24', cover: 31.2, sector: 'Northern' },
      { year: '2024/25', cover: 29.6, sector: 'Northern' },
      { year: '2019/20', cover: 32.1, sector: 'Central' },
      { year: '2020/21', cover: 31.0, sector: 'Central' },
      { year: '2021/22', cover: 30.2, sector: 'Central' },
      { year: '2022/23', cover: 31.8, sector: 'Central' },
      { year: '2023/24', cover: 33.5, sector: 'Central' },
      { year: '2024/25', cover: 24.8, sector: 'Central' },
      { year: '2019/20', cover: 38.2, sector: 'Southern' },
      { year: '2020/21', cover: 36.8, sector: 'Southern' },
      { year: '2021/22', cover: 35.4, sector: 'Southern' },
      { year: '2022/23', cover: 37.1, sector: 'Southern' },
      { year: '2023/24', cover: 38.9, sector: 'Southern' },
      { year: '2024/25', cover: 26.4, sector: 'Southern' },
    ],
  },
  {
    slug: 'chips',
    kicker: 'Semiconductor manufacturing',
    title: 'Where advanced chips are actually made',
    note: 'Leading-edge logic and packaging. One island holds most of the world’s capacity.',
    insight:
      '“Advanced chips” is not all semiconductors — it is the bleeding-edge nodes phone and AI accelerators need. Taiwan’s share is not an accident: TSMC concentrated capital, talent, and customer trust for decades while others chased memory or lagged on R&D.\n\nThe concentration is the story. A disruption in Taiwan would not just raise prices — it would idle factories worldwide with no quick substitute. Policy talk about “friend-shoring” is really about buying down that single-point-of-failure risk, slowly.',
    config: studioChart(
      { type: 'bar', barPadding: 0.34, cornerRadius: 0 },
      { x: 'region', y: 'share', color: 'tone' },
      {
        axes: {
          x: { label: 'Region' },
          y: { label: 'Share of advanced output, %', tickCount: 5, domain: [0, 70] },
        },
        source: {
          label: 'Industry capacity estimates (SIA / TrendForce summaries)',
          method: 'estimate',
          retrieved: '2025-06',
          evidence: 'Leading-edge share, rounded published ranges',
        },
        accessibility: {
          title: 'Where advanced chips are actually made',
          description: 'Leading-edge logic and packaging. One island holds most of the world’s capacity.',
        },
      }
    ),
    data: [
      { region: 'Taiwan', share: 68, tone: STUDIO.mark },
      { region: 'South Korea', share: 12, tone: DUST_MID[5] },
      { region: 'United States', share: 6, tone: DUST[4] },
      { region: 'China', share: 5, tone: DUST[1] },
      { region: 'Japan', share: 4, tone: DUST[3] },
      { region: 'Europe', share: 3, tone: DUST[7] },
      { region: 'Singapore', share: 2, tone: DUST[6] },
    ],
  },
  {
    slug: 'ozone',
    kicker: 'Atmospheric science',
    title: 'Antarctic ozone hole peak area since 1980',
    note: 'September maxima in million km². The Montreal Protocol bend is visible — variability still swings wide.',
    insight:
      'The ozone hole is seasonal: each Antarctic spring, cold stratospheric clouds let chlorine destroy ozone fast. “Peak area” is how big that wound gets before summer warmth closes it.\n\nThe long decline after the 1990s is the Montreal Protocol working — CFCs were phased out and stratospheric chlorine is finally falling. Recent bumps do not undo that victory; they reflect cold winters and volcanic aerosols temporarily sharpening the hole. Recovery is measured in decades, not years.',
    config: studioChart(
      {
        type: 'line',
        curve: 'linear',
        strokeWidth: 1.5,
        showPoints: false,
        area: true,
      },
      { x: 'year', y: 'area' },
      {
        axes: {
          x: { show: true, grid: false, label: 'Year' },
          y: {
            show: true,
            grid: true,
            gridOpacity: 0.55,
            tickCount: 5,
            label: 'Peak area, M km²',
          },
        },
        source: {
          label: 'NASA Ozone Watch / NOAA',
          method: 'official',
          url: 'https://ozonewatch.gsfc.nasa.gov/',
          retrieved: '2025-08',
          evidence: 'September daily max, selected years',
        },
        accessibility: {
          title: 'Antarctic ozone hole peak area since 1980',
          description: 'September maxima in million km². The Montreal Protocol bend is visible.',
        },
      }
    ),
    data: [
      { year: '1980', area: 2.1 },
      { year: '1985', area: 8.4 },
      { year: '1990', area: 11.5 },
      { year: '1995', area: 16.2 },
      { year: '2000', area: 24.8 },
      { year: '2006', area: 26.1 },
      { year: '2010', area: 18.9 },
      { year: '2015', area: 22.4 },
      { year: '2019', area: 16.4 },
      { year: '2023', area: 23.1 },
    ],
  },
  {
    slug: 'tigers',
    kicker: 'Wildlife recovery',
    title: 'Wild tiger population by country today',
    note: 'Published national estimates. India carries most of the world’s remaining tigers.',
    insight:
      'Wild tiger counts are hard — they come from camera traps, pugmark surveys, and habitat models, not censuses. Treat small differences between years as noise; country rank order is the reliable part.\n\nIndia’s lead is policy plus payroll: dedicated reserves, ranger funding, and political will to punish poaching. Neighbors with flat or falling bars usually lost habitat to roads and farms, not indifference to tigers themselves. Global tiger numbers recovered from a 2010 low, but almost all the gain is concentrated in a handful of states.',
    config: studioChart(
      { type: 'bar', barPadding: 0.32, cornerRadius: 0, showValues: true },
      { x: 'country', y: 'tigers', color: 'tone' },
      {
        axes: {
          x: { label: 'Country' },
          y: { label: 'Wild tigers', tickCount: 5 },
        },
        source: {
          label: 'WWF / national tiger census reports',
          method: 'official',
          retrieved: '2024-11',
          evidence: 'Latest published national totals',
        },
        accessibility: {
          title: 'Wild tiger population by country today',
          description: 'Published national estimates. India carries most of the world’s remaining tigers.',
        },
      }
    ),
    data: [
      { country: 'India', tigers: 3682, tone: STUDIO.mark },
      { country: 'Russia', tigers: 433, tone: DUST_MID[1] },
      { country: 'Nepal', tigers: 355, tone: DUST[2] },
      { country: 'Indonesia', tigers: 148, tone: DUST[4] },
      { country: 'Thailand', tigers: 148, tone: DUST[6] },
      { country: 'Malaysia', tigers: 120, tone: DUST[0] },
      { country: 'Bhutan', tigers: 103, tone: DUST[3] },
      { country: 'Bangladesh', tigers: 96, tone: DUST[5] },
    ],
  },
  {
    slug: 'vinyl',
    kicker: 'Music formats',
    title: 'US vinyl revenue since the revival',
    note: 'RIAA wholesale revenue. Vinyl passed CDs in 2022 — streaming still earns most of the money.',
    insight:
      'RIAA charts measure dollars, not discs. Vinyl’s comeback is partly price — a new LP costs more than a CD — and partly collectors and artists who wanted a physical artifact again.\n\nVinyl passed CD revenue in 2022 for the first time since the 1980s. That is mostly symbolism: streaming still earns the vast majority of US music money. The line matters because it shows a format written off twice can still bend back if fans will pay for ritual.',
    config: studioChart(
      {
        type: 'line',
        curve: 'linear',
        strokeWidth: 1.5,
        showPoints: true,
        pointRadius: 3,
        area: false,
      },
      { x: 'year', y: 'revenue' },
      {
        axes: {
          x: { show: true, grid: false, label: 'Year' },
          y: {
            show: true,
            grid: true,
            gridOpacity: 0.55,
            tickCount: 5,
            label: 'Vinyl revenue, $M',
          },
        },
        source: {
          label: 'RIAA US sales database',
          method: 'official',
          url: 'https://www.riaa.com/u-s-sales-database/',
          retrieved: '2025-03',
          evidence: 'CD vs vinyl revenue, selected years',
        },
        accessibility: {
          title: 'US vinyl revenue since the revival',
          description: 'RIAA wholesale revenue. Vinyl passed CDs in 2022.',
        },
      }
    ),
    data: [
      { year: '2008', revenue: 67 },
      { year: '2012', revenue: 171 },
      { year: '2016', revenue: 344 },
      { year: '2018', revenue: 428 },
      { year: '2020', revenue: 619 },
      { year: '2021', revenue: 1090 },
      { year: '2022', revenue: 1242 },
      { year: '2023', revenue: 1420 },
    ],
  },
];

export function pieceBySlug(slug: string): Piece | undefined {
  return PIECES.find((piece) => piece.slug === slug);
}
