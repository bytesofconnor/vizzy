export type FastExample = {
  id: string;
  label: string;
  prompt: string;
  seriesId: string;
};

export const FAST_EXAMPLES: readonly FastExample[] = [
  {
    id: 'unemployment',
    label: 'US unemployment since 2000',
    prompt: 'US unemployment since 2000',
    seriesId: 'UNRATE',
  },
  {
    id: 'mortgage',
    label: '30-year mortgage rate',
    prompt: '30-year mortgage rate',
    seriesId: 'MORTGAGE30US',
  },
  {
    id: 'co2',
    label: 'CO2 per capita',
    prompt: 'CO2 per capita',
    seriesId: 'co2_per_capita',
  },
  {
    id: 'gdp',
    label: 'US GDP since 2000',
    prompt: 'US GDP since 2000',
    seriesId: 'GDPCA',
  },
  {
    id: 'sp500',
    label: 'S&P 500 last 20 years',
    prompt: 'S&P 500 last 20 years',
    seriesId: 'SP500',
  },
  {
    id: 'fed',
    label: 'Federal funds rate',
    prompt: 'Federal funds rate',
    seriesId: 'FEDFUNDS',
  },
];
