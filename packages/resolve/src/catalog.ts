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
    family: 'noaa',
    seriesId: 'ozone_hole_area',
    sourceLabel: 'Our World in Data — Antarctic ozone hole (NASA Ozone Watch)',
    sourceUrl: 'https://ourworldindata.org/grapher/antarctic-ozone-hole-area',
    xLabel: 'Year',
    yLabel: 'Peak hole (million km²)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'ozone') && has(q, 'hole', 'montreal', 'antarctic');
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
    seriesId: 'refugees_hosted',
    sourceLabel: 'Wikipedia — refugees by country of asylum',
    sourceUrl: 'https://en.wikipedia.org/wiki/List_of_sovereign_states_by_refugee_population',
    xLabel: 'Country',
    yLabel: 'Refugees hosted',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'refugee', 'refugees');
    },
  },
  {
    family: 'wiki',
    seriesId: 'un_votes_ukraine',
    sourceLabel: 'Wikipedia — UNGA ES-11 votes on Ukraine',
    sourceUrl: 'https://en.wikipedia.org/wiki/Eleventh_emergency_special_session_of_the_United_Nations_General_Assembly',
    xLabel: 'Resolution',
    yLabel: 'Yes votes',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'ukraine') && has(q, 'vote', 'votes', 'assembly') && has(q, 'un', 'unga', 'united nations');
    },
  },
  {
    family: 'wiki',
    seriesId: 'foundry_revenue',
    sourceLabel: 'Wikipedia — semiconductor foundry revenue',
    sourceUrl: 'https://en.wikipedia.org/wiki/Foundry_model',
    xLabel: 'Foundry',
    yLabel: 'Revenue ($m)',
    match: (asked) => {
      const q = foldAsked(asked);
      return (
        (has(q, 'chip', 'chips', 'semiconductor') && has(q, 'taiwan', 'tsmc')) ||
        (has(q, 'foundry') && has(q, 'revenue', 'semiconductor', 'chip', 'chips', 'taiwan'))
      );
    },
  },
  {
    family: 'wiki',
    seriesId: 'solar_share',
    sourceLabel: 'Wikipedia — solar power by country',
    sourceUrl: 'https://en.wikipedia.org/wiki/Solar_power_by_country',
    xLabel: 'Country',
    yLabel: 'Solar share of generation %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'solar') && has(q, 'electricity', 'generation', '10%', 'share');
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
    family: 'worldbank',
    seriesId: 'SP.DYN.TFRT.IN',
    sourceLabel: 'World Bank — fertility rate',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.DYN.TFRT.IN',
    xLabel: 'Country',
    yLabel: 'Births per woman',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'fertility') || (has(q, 'children') && has(q, 'enough', 'replacement', 'birth'));
    },
  },
  {
    family: 'worldbank',
    seriesId: 'NY.GDP.PCAP.CD',
    sourceLabel: 'World Bank — GDP per capita',
    sourceUrl: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
    xLabel: 'Country',
    yLabel: 'USD per person',
    match: (asked) => {
      const q = foldAsked(asked);
      return (
        has(q, 'gdp per capita', 'gdp per person') ||
        (has(q, 'gdp') && has(q, 'per capita', 'per person', 'pulled away'))
      );
    },
  },
  {
    family: 'worldbank',
    seriesId: 'EG.ELC.ACCS.ZS',
    sourceLabel: 'World Bank — access to electricity',
    sourceUrl: 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS',
    xLabel: 'Country',
    yLabel: 'Access %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'electricity') && has(q, 'access', 'gaps', 'people with') && !has(q, 'solar');
    },
  },
  {
    family: 'worldbank',
    seriesId: 'SL.UEM.1524.ZS',
    sourceLabel: 'World Bank — youth unemployment',
    sourceUrl: 'https://data.worldbank.org/indicator/SL.UEM.1524.ZS',
    xLabel: 'Country',
    yLabel: 'Youth unemployment %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'youth') && has(q, 'unemployment', 'jobless');
    },
  },
  {
    family: 'worldbank',
    seriesId: 'SP.POP.65UP.TO.ZS',
    sourceLabel: 'World Bank — population aged 65+',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.65UP.TO.ZS',
    xLabel: 'Country',
    yLabel: 'Share aged 65+ %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, '65') && has(q, 'population', 'aged', 'aging', 'ageing', 'crossed');
    },
  },
  {
    family: 'worldbank',
    seriesId: 'MS.MIL.XPND.GD.ZS',
    sourceLabel: 'World Bank — military spending (% of GDP)',
    sourceUrl: 'https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS',
    xLabel: 'Country',
    yLabel: 'Military % of GDP',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'military') && has(q, 'spending', 'expenditure', 'gdp', 'war footing');
    },
  },
  {
    family: 'worldbank',
    seriesId: 'BX.TRF.PWKR.DT.GD.ZS',
    sourceLabel: 'World Bank — remittances received (% of GDP)',
    sourceUrl: 'https://data.worldbank.org/indicator/BX.TRF.PWKR.DT.GD.ZS',
    xLabel: 'Country',
    yLabel: 'Remittances % of GDP',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'remittance', 'remittances');
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
      if (has(q, 'youth')) {
        return false;
      }
      return (
        has(q, 'unrate') ||
        ((has(q, 'unemployment') || has(q, 'jobless rate')) &&
          has(q, 'us', 'u.s.', 'united states', 'american', 'u.s'))
      );
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
      return has(q, 'fed funds', 'federal funds rate', 'fed fund', 'fed hiking');
    },
  },
  {
    family: 'fred',
    seriesId: 'HOUST',
    sourceLabel: 'FRED — U.S. housing starts',
    sourceUrl: 'https://fred.stlouisfed.org/series/HOUST',
    xLabel: 'Month',
    yLabel: 'Starts (thousands)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'housing starts', 'housing start') || (has(q, 'housing') && has(q, 'starts', 'permits'));
    },
  },
  {
    family: 'owid',
    seriesId: 'temperature_anomaly',
    sourceLabel: 'Our World in Data — global temperature anomaly',
    sourceUrl: 'https://ourworldindata.org/grapher/temperature-anomaly',
    xLabel: 'Year',
    yLabel: 'Anomaly °C',
    match: (asked) => {
      const q = foldAsked(asked);
      return (
        (has(q, 'temperature') && has(q, 'anomaly', 'global', '1880', 'warming')) ||
        has(q, 'global temperature')
      );
    },
  },
  {
    family: 'owid',
    seriesId: 'arctic_sea_ice',
    sourceLabel: 'Our World in Data — Arctic sea ice (NSIDC)',
    sourceUrl: 'https://ourworldindata.org/grapher/arctic-sea-ice',
    xLabel: 'Year',
    yLabel: 'September minimum (million km²)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'sea ice') || (has(q, 'arctic') && has(q, 'ice'));
    },
  },
  {
    family: 'owid',
    seriesId: 'us_wildfire_area',
    sourceLabel: 'Our World in Data — area burnt by wildfires (United States)',
    sourceUrl: 'https://ourworldindata.org/grapher/annual-area-burnt-by-wildfires',
    xLabel: 'Year',
    yLabel: 'Area burned (ha)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'wildfire', 'wildfires') && has(q, 'acre', 'acres', 'burned', 'burnt', 'season');
    },
  },
  {
    family: 'owid',
    seriesId: 'lithium_production',
    sourceLabel: 'Our World in Data — lithium mine production',
    sourceUrl: 'https://ourworldindata.org/grapher/lithium-production',
    xLabel: 'Country',
    yLabel: 'Production (tonnes)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'lithium');
    },
  },
  {
    family: 'owid',
    seriesId: 'ev_share',
    sourceLabel: 'Our World in Data — electric share of new cars',
    sourceUrl: 'https://ourworldindata.org/grapher/electric-car-sales-share',
    xLabel: 'Country',
    yLabel: 'Electric share of new cars %',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'electric') && has(q, 'car', 'cars', 'vehicle', 'vehicles', 'ev') && has(q, 'share', 'sales', '20%');
    },
  },
  {
    family: 'owid',
    seriesId: 'oil_production',
    sourceLabel: 'Our World in Data — oil production',
    sourceUrl: 'https://ourworldindata.org/grapher/oil-production-by-country',
    xLabel: 'Country',
    yLabel: 'Oil production',
    match: (asked) => {
      const q = foldAsked(asked);
      return (
        (has(q, 'crude oil') || has(q, 'oil production') || has(q, 'shale')) &&
        has(q, 'country', 'countries', 'us', 'u.s.', 'crown', 'production')
      );
    },
  },
  {
    family: 'wiki',
    seriesId: 'gold_reserves',
    sourceLabel: 'Wikipedia — official gold reserves',
    sourceUrl: 'https://en.wikipedia.org/wiki/Gold_reserve',
    xLabel: 'Country',
    yLabel: 'Gold (tonnes)',
    match: (asked) => {
      const q = foldAsked(asked);
      return has(q, 'gold') && has(q, 'reserve', 'reserves');
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
