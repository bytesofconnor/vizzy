import { ChartConfig, DataPoint } from '@vizzy/core';
import { DUST, DUST_MID, STUDIO, studioChart } from './theme';

export interface Piece {
  slug: string;
  kicker: string;
  title: string;
  note: string;
  config: ChartConfig;
  data: DataPoint[];
}

export const PIECES: Piece[] = [
  {
    slug: 'july',
    kicker: 'Cash collected',
    title: 'July paid for the year',
    note: '2025, thousands. July is the only month that cleared payroll twice.',
    config: studioChart(
      { type: 'bar', barPadding: 0.4, cornerRadius: 0 },
      { x: 'month', y: 'cash', color: 'tone' },
      {
        axes: {
          x: { label: 'Month' },
          y: { label: 'Cash, $k' },
        },
        source: {
          label: 'Internal payouts CSV',
          method: 'example',
          retrieved: '2025-08',
          evidence: '8 months, complete',
        },
        accessibility: {
          title: 'July paid for the year',
          description: '2025, thousands. July is the only month that cleared payroll twice.',
        },
      }
    ),
    data: [
      { month: 'Jan', cash: 41, tone: DUST[0] },
      { month: 'Feb', cash: 38, tone: DUST[1] },
      { month: 'Mar', cash: 44, tone: DUST[2] },
      { month: 'Apr', cash: 47, tone: DUST[3] },
      { month: 'May', cash: 43, tone: DUST[4] },
      { month: 'Jun', cash: 51, tone: DUST[5] },
      { month: 'Jul', cash: 96, tone: STUDIO.mark },
      { month: 'Aug', cash: 49, tone: DUST[7] },
    ],
  },
  {
    slug: 'price',
    kicker: 'Weekly churn',
    title: 'The leak started the week we raised prices',
    note: 'Cancel rate, percent of active accounts. The line does not come back.',
    config: studioChart(
      {
        type: 'line',
        curve: 'linear',
        strokeWidth: 1.5,
        showPoints: false,
        pointRadius: 3,
        area: true,
      },
      { x: 'week', y: 'churn' },
      {
        axes: {
          x: { show: true, grid: false, label: 'Week' },
          y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 4, domain: [0, 4], label: 'Cancel rate, %' },
        },
        source: {
          label: 'Amplitude weekly churn',
          method: 'example',
          retrieved: '2025-08',
          evidence: '8 weeks, no fill',
        },
        accessibility: {
          title: 'The leak started the week we raised prices',
          description: 'Cancel rate, percent of active accounts. The line does not come back.',
        },
      }
    ),
    data: [
      { week: 'W1', churn: 1.1 },
      { week: 'W2', churn: 1.0 },
      { week: 'W3', churn: 1.2 },
      { week: 'W4', churn: 1.1 },
      { week: 'W5', churn: 2.8 },
      { week: 'W6', churn: 3.4 },
      { week: 'W7', churn: 3.1 },
      { week: 'W8', churn: 3.3 },
    ],
  },
  {
    slug: 'corners',
    kicker: 'Tickets per shop',
    title: 'The corner shops still win',
    note: 'Saturday lunch, one city. Chains look busy. They are not first.',
    config: studioChart(
      { type: 'bar', barPadding: 0.36, cornerRadius: 0 },
      { x: 'shop', y: 'tickets', color: 'tone' },
      {
        axes: {
          x: { label: 'Shop' },
          y: { label: 'Tickets' },
        },
        source: {
          label: 'Square tickets, one Saturday',
          method: 'example',
          retrieved: '2025-06',
          evidence: '5 shops, lunch window',
        },
        accessibility: {
          title: 'The corner shops still win',
          description: 'Saturday lunch, one city. Chains look busy. They are not first.',
        },
      }
    ),
    data: [
      { shop: 'Ada’s', tickets: 86, tone: STUDIO.mark },
      { shop: 'Pearl', tickets: 74, tone: DUST_MID[1] },
      { shop: 'North', tickets: 61, tone: DUST_MID[3] },
      { shop: 'Metro', tickets: 48, tone: DUST[5] },
      { shop: 'Quick', tickets: 41, tone: DUST[7] },
    ],
  },
  {
    slug: 'tips',
    kicker: 'Wait vs tip',
    title: 'Slow tables did not tip more',
    note: 'Friday dinner. Minutes seated against tip as a share of the check.',
    config: studioChart(
      { type: 'scatter', pointRadius: 3.5, pointOpacity: 0.72, showTrendLine: false },
      { x: 'minutes', y: 'tip', color: 'tone' },
      {
        axes: {
          x: { label: 'Minutes seated' },
          y: { label: 'Tip, %' },
        },
        source: {
          label: 'POS checks, Friday dinner',
          method: 'example',
          retrieved: '2025-07',
          evidence: '12 tables, one night',
        },
        accessibility: {
          title: 'Slow tables did not tip more',
          description: 'Friday dinner. Minutes seated against tip as a share of the check.',
        },
      }
    ),
    data: [
      { minutes: 38, tip: 18, tone: DUST[0] },
      { minutes: 44, tip: 20, tone: DUST[1] },
      { minutes: 51, tip: 17, tone: DUST[2] },
      { minutes: 55, tip: 22, tone: DUST[3] },
      { minutes: 62, tip: 16, tone: DUST[4] },
      { minutes: 71, tip: 19, tone: DUST[5] },
      { minutes: 84, tip: 15, tone: DUST[6] },
      { minutes: 91, tip: 14, tone: DUST[7] },
      { minutes: 47, tip: 21, tone: DUST[2] },
      { minutes: 58, tip: 18, tone: DUST[4] },
      { minutes: 76, tip: 17, tone: DUST[5] },
      { minutes: 103, tip: 13, tone: DUST[6] },
    ],
  },
  {
    slug: 'keep',
    kicker: 'Week-one retention',
    title: 'They stay if they do one thing on day one',
    note: 'Percent of new accounts that come back within seven days.',
    config: studioChart(
      {
        type: 'line',
        curve: 'linear',
        strokeWidth: 1.5,
        showPoints: false,
        pointRadius: 3,
        area: false,
      },
      { x: 'cohort', y: 'kept' },
      {
        axes: {
          x: { show: true, grid: false, label: 'Cohort' },
          y: { show: true, grid: true, gridOpacity: 0.55, tickCount: 4, domain: [0, 50], label: 'Kept, %' },
        },
        source: {
          label: 'Segment week-one retention',
          method: 'example',
          retrieved: '2025-07',
          evidence: '7 cohorts',
        },
        accessibility: {
          title: 'They stay if they do one thing on day one',
          description: 'Percent of new accounts that come back within seven days.',
        },
      }
    ),
    data: [
      { cohort: 'Jan', kept: 22 },
      { cohort: 'Feb', kept: 24 },
      { cohort: 'Mar', kept: 21 },
      { cohort: 'Apr', kept: 28 },
      { cohort: 'May', kept: 41 },
      { cohort: 'Jun', kept: 44 },
      { cohort: 'Jul', kept: 46 },
    ],
  },
];

export function pieceBySlug(slug: string): Piece | undefined {
  return PIECES.find((piece) => piece.slug === slug);
}
