import { foldAsked } from './normalize';
import type { Recipe } from './types';

function has(asked: string, ...needles: string[]): boolean {
  return needles.some((needle) => asked.includes(needle));
}

export const RECIPES: readonly Recipe[] = [
  {
    family: 'noaa',
    seriesId: 'co2_annmean_mlo',
    sourceLabel: 'NOAA GML — Mauna Loa CO₂ annual mean',
    sourceUrl: 'https://gml.noaa.gov/ccgg/trends/data.html',
    xLabel: 'Year',
    yLabel: 'CO₂ ppm',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'mauna loa') || (has(q, 'co2', 'co₂', 'carbon dioxide') && has(q, 'atmosphere', 'atmospheric', 'keeling'));
    },
  },
  {
    family: 'usgs',
    seriesId: 'm8_since_2000',
    sourceLabel: 'USGS earthquake catalog — magnitude 8+',
    sourceUrl: 'https://earthquake.usgs.gov/earthquakes/search/',
    xLabel: 'Place',
    yLabel: 'Magnitude',
    match: (asked) => {
      const q = foldAsked(asked);
      return (
        has(q, 'earthquake', 'earthquakes', 'quakes') &&
        (has(q, 'magnitude') || has(q, 'strongest') || has(q, 'since 2000'))
      );
    },
  },
  {
    family: 'wiki',
    seriesId: 'languages_native',
    sourceLabel: 'Wikipedia — languages by native speakers',
    sourceUrl: 'https://en.wikipedia.org/wiki/List_of_languages_by_number_of_native_speakers',
    xLabel: 'Language',
    yLabel: 'Native speakers (millions)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'language', 'languages') && has(q, 'speaker', 'speakers', 'mandarin');
    },
  },
  {
    family: 'wiki',
    seriesId: 'eurovision_wins',
    sourceLabel: 'Wikipedia — Eurovision wins by country',
    sourceUrl: 'https://en.wikipedia.org/wiki/Eurovision_Song_Contest',
    xLabel: 'Country',
    yLabel: 'Wins',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'eurovision');
    },
  },
  {
    family: 'wiki',
    seriesId: 'olympic_100m_men',
    sourceLabel: 'Wikipedia — men\'s Olympic 100 metres',
    sourceUrl: 'https://en.wikipedia.org/wiki/100_metres_at_the_Olympics',
    xLabel: 'Games',
    yLabel: 'Winning time (s)',
    match: (asked) => {
      const q = foldAsked(asked);
      return (has(q, '100m', '100 m', '100 metres', '100 meters') && has(q, 'olympic')) || has(q, 'olympic 100');
    },
  },
  {
    family: 'worldbank',
    seriesId: 'SP.DYN.LE00.IN',
    sourceLabel: 'World Bank — life expectancy at birth',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN',
    xLabel: 'Country',
    yLabel: 'Years',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'life expectancy');
    },
  },
  {
    family: 'fred',
    seriesId: 'UNRATE',
    sourceLabel: 'FRED — U.S. unemployment rate',
    sourceUrl: 'https://fred.stlouisfed.org/series/UNRATE',
    xLabel: 'Month',
    yLabel: 'Unemployment %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'unemployment', 'jobless rate', 'unrate');
    },
  },
  {
    family: 'fred',
    seriesId: 'CPIAUCSL',
    sourceLabel: 'FRED — U.S. CPI',
    sourceUrl: 'https://fred.stlouisfed.org/series/CPIAUCSL',
    xLabel: 'Month',
    yLabel: 'CPI',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'consumer price', 'cpi') || (has(q, 'inflation') && has(q, 'us', 'u.s.', 'united states', 'american'));
    },
  },
  {
    family: 'fred',
    seriesId: 'FEDFUNDS',
    sourceLabel: 'FRED — federal funds rate',
    sourceUrl: 'https://fred.stlouisfed.org/series/FEDFUNDS',
    xLabel: 'Month',
    yLabel: 'Rate %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'fed funds', 'federal funds rate', 'fed fund');
    },
  },
];

export function matchPrompt(asked: string): Recipe | null {
  const text = asked.trim();
  if (text.length < 8) {
    return null;
  }
  for (const recipe of RECIPES) {
    if (recipe.match(text)) {
      return recipe;
    }
  }
  return null;
}
