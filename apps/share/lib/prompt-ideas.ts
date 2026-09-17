import { DUST } from './theme';

export type PromptTopic =
  | 'culture'
  | 'nature'
  | 'earth'
  | 'world'
  | 'science'
  | 'history'
  | 'music'
  | 'tech'
  | 'art'
  | 'sport';

export type PromptIdea = {
  id: string;
  topic: PromptTopic;
  prompt: string;
  tone: string;
};

/** Curious, chartable questions. Add one object per idea. */
export const PROMPT_IDEAS: readonly PromptIdea[] = [
  {
    id: 'ozone',
    topic: 'science',
    prompt: 'Antarctic ozone hole peak area by year since 1980 — can you see the Montreal Protocol working?',
    tone: DUST[4],
  },
  {
    id: 'tigers',
    topic: 'nature',
    prompt: 'Wild tiger population by country today — where did they come back, and where did they vanish?',
    tone: DUST[2],
  },
  {
    id: 'languages',
    topic: 'world',
    prompt: 'Top ten languages by native speakers — how far ahead is Mandarin, and is English closing the gap?',
    tone: DUST[0],
  },
  {
    id: 'vinyl',
    topic: 'music',
    prompt: 'When did US vinyl sales overtake CDs again — and how fast did the crossover happen?',
    tone: DUST[4],
  },
  {
    id: 'quakes',
    topic: 'earth',
    prompt: 'Strongest earthquakes since 2000 by magnitude — are they clustering in fewer regions?',
    tone: DUST[1],
  },
  {
    id: 'refugees',
    topic: 'world',
    prompt: 'Refugees hosted by country today — who takes the most, relative to their own population?',
    tone: DUST[5],
  },
  {
    id: 'exoplanets',
    topic: 'science',
    prompt: 'Exoplanets confirmed per year — when did the Kepler and JWST eras show up in the curve?',
    tone: DUST[6],
  },
  {
    id: 'box-office',
    topic: 'culture',
    prompt: 'Highest-grossing films adjusted for inflation — which decade still owns the top five?',
    tone: DUST[7],
  },
  {
    id: 'reef',
    topic: 'nature',
    prompt: 'Great Barrier Reef coral cover by year — where are the steepest drops?',
    tone: DUST[3],
  },
  {
    id: 'smartphones',
    topic: 'tech',
    prompt: 'Global smartphone share by brand over the last fifteen years — when did the iPhone pass Nokia?',
    tone: DUST[5],
  },
  {
    id: 'museums',
    topic: 'art',
    prompt: 'Most visited art museums in the world — how far did attendance fall in 2020, and what came back?',
    tone: DUST[0],
  },
  {
    id: 'sprint',
    topic: 'sport',
    prompt: "Men's Olympic 100m winning times since 1968 — how much did the record actually fall?",
    tone: DUST[3],
  },
  {
    id: 'volcanoes',
    topic: 'earth',
    prompt: 'Deadliest volcanic eruptions since 1800 by lives lost — which century was worst?',
    tone: DUST[1],
  },
  {
    id: 'eurovision',
    topic: 'culture',
    prompt: 'Eurovision wins by country — is Ireland still the record holder?',
    tone: DUST[7],
  },
  {
    id: 'co2',
    topic: 'science',
    prompt: 'Atmospheric CO₂ at Mauna Loa by decade — where does the curve bend after Paris?',
    tone: DUST[2],
  },
  {
    id: 'streaming',
    topic: 'music',
    prompt: 'Spotify most-streamed songs of all time — how many of the top ten are from the 2020s?',
    tone: DUST[4],
  },
  {
    id: 'chips',
    topic: 'tech',
    prompt: 'Share of advanced chips made in Taiwan vs the rest of the world — how concentrated is it?',
    tone: DUST[6],
  },
  {
    id: 'moon',
    topic: 'science',
    prompt: 'Every crewed moon mission by year and country — how long was the gap after Apollo?',
    tone: DUST[6],
  },
  {
    id: 'bees',
    topic: 'nature',
    prompt: 'Managed honeybee colony losses by season in the US — are the bad years getting more frequent?',
    tone: DUST[2],
  },
  {
    id: 'forest',
    topic: 'nature',
    prompt: 'Share of land covered by forest — who is still a forest country, and who already converted it?',
    tone: DUST[3],
  },
  {
    id: 'deforestation',
    topic: 'nature',
    prompt: 'Annual deforestation by country — who is still cutting the fastest?',
    tone: DUST[1],
  },
  {
    id: 'tree-cover',
    topic: 'nature',
    prompt: 'Tree cover loss by country — who lost the most canopy after 2000?',
    tone: DUST[5],
  },
  {
    id: 'protected',
    topic: 'earth',
    prompt: 'Share of land in protected areas — who actually set habitat aside?',
    tone: DUST[6],
  },
  {
    id: 'marine-parks',
    topic: 'earth',
    prompt: 'Marine protected area share — who closed fishing grounds, and who did not?',
    tone: DUST[4],
  },
  {
    id: 'living-planet',
    topic: 'nature',
    prompt: 'Living Planet Index since 1970 — how far did vertebrate wildlife abundance fall?',
    tone: DUST[2],
  },
  {
    id: 'fish-stocks',
    topic: 'nature',
    prompt: 'Share of fish stocks that are overexploited — did the FAO curve keep rising?',
    tone: DUST[0],
  },
  {
    id: 'density',
    topic: 'earth',
    prompt: 'Population density by country — who is actually the most crowded?',
    tone: DUST[7],
  },
  {
    id: 'plastic',
    topic: 'earth',
    prompt: 'Plastic waste emitted to the ocean by country — who is leaking the most?',
    tone: DUST[1],
  },
  {
    id: 'farmland',
    topic: 'earth',
    prompt: 'Agricultural land as a share of country area — who turned the map into farms?',
    tone: DUST[3],
  },
  {
    id: 'un-votes',
    topic: 'world',
    prompt: 'UN General Assembly votes on Ukraine since 2022 — how many yes, no, and abstain each year?',
    tone: DUST[5],
  },
  {
    id: 'auction',
    topic: 'art',
    prompt: 'Highest auction price for a living artist by year — when did the records start jumping?',
    tone: DUST[0],
  },
  {
    id: 'life-expectancy',
    topic: 'world',
    prompt: 'Life expectancy at birth by country — who gained the most years since 2000, and who stalled?',
    tone: DUST[3],
  },
  {
    id: 'solar',
    topic: 'tech',
    prompt: 'Solar electricity as a share of total generation — which countries crossed 10% first?',
    tone: DUST[4],
  },
  {
    id: 'hurricanes',
    topic: 'earth',
    prompt: 'Named Atlantic hurricanes per decade since 1960 — are the busy seasons bunching together?',
    tone: DUST[1],
  },
  {
    id: 'unemployment',
    topic: 'world',
    prompt: 'U.S. unemployment rate since 2000 — which recoveries actually brought jobs back, and which did not?',
    tone: DUST[5],
  },
  {
    id: 'inflation',
    topic: 'world',
    prompt: 'U.S. CPI inflation since 2000 — when did the post-2020 spike actually start to break?',
    tone: DUST[0],
  },
  {
    id: 'fed-funds',
    topic: 'world',
    prompt: 'U.S. federal funds rate since 1990 — how violent were the hiking cycles versus the cuts?',
    tone: DUST[6],
  },
  {
    id: 'fertility',
    topic: 'world',
    prompt: 'Fertility rate by country since 1990 — who fell below replacement first, and who is still above?',
    tone: DUST[3],
  },
  {
    id: 'gdp-capita',
    topic: 'world',
    prompt: 'GDP per capita by country since 2000 — who pulled away, and who got stuck?',
    tone: DUST[4],
  },
  {
    id: 'electricity',
    topic: 'tech',
    prompt: 'Share of people with electricity by country — who closed the last big gaps after 2000?',
    tone: DUST[2],
  },
  {
    id: 'sea-ice',
    topic: 'earth',
    prompt: 'Arctic sea ice September minimum since 1979 — when did the collapse actually steepen?',
    tone: DUST[5],
  },
  {
    id: 'lithium',
    topic: 'tech',
    prompt: 'Lithium mine production by country — how much of the battery metal still sits in Australia and Chile?',
    tone: DUST[1],
  },
  {
    id: 'rare-earths',
    topic: 'world',
    prompt: 'Rare earth mine production by country — how much of the world’s supply still sits in China?',
    tone: DUST[7],
  },
  {
    id: 'datacenters',
    topic: 'tech',
    prompt: 'US data-center electricity use by year — how fast is it catching heavy industry?',
    tone: DUST[6],
  },
  {
    id: 'lng',
    topic: 'world',
    prompt: 'LNG exports by country since 2010 — who passed Qatar, and did the US keep the lead?',
    tone: DUST[4],
  },
  {
    id: 'gold',
    topic: 'world',
    prompt: 'Official gold reserves by country — who stacked bars after 2010, and who sold?',
    tone: DUST[0],
  },
  {
    id: 'passports',
    topic: 'world',
    prompt: 'Visa-free destinations by passport — how far ahead are Singapore and Japan?',
    tone: DUST[3],
  },
  {
    id: 'youth-jobs',
    topic: 'world',
    prompt: 'Youth unemployment by country — who stayed stuck above 20% after 2015?',
    tone: DUST[5],
  },
  {
    id: 'housing-starts',
    topic: 'world',
    prompt: 'US housing starts versus permits since 2000 — which recoveries actually built houses?',
    tone: DUST[1],
  },
  {
    id: 'aging',
    topic: 'world',
    prompt: 'Share of population aged 65+ by country — who crossed 20% first, and who is next?',
    tone: DUST[2],
  },
  {
    id: 'military',
    topic: 'world',
    prompt: 'Military spending as a share of GDP — who stayed on a war footing after 2014?',
    tone: DUST[7],
  },
  {
    id: 'oil',
    topic: 'world',
    prompt: 'Crude oil production by country — did the US shale boom actually take the crown?',
    tone: DUST[4],
  },
  {
    id: 'ev',
    topic: 'tech',
    prompt: 'Electric share of new car sales by country — who crossed 20% first?',
    tone: DUST[6],
  },
  {
    id: 'reactors',
    topic: 'tech',
    prompt: 'Nuclear reactors under construction by country — is China the entire curve now?',
    tone: DUST[3],
  },
  {
    id: 'wildfire',
    topic: 'earth',
    prompt: 'US wildfire acres burned by year — which seasons dwarf the 1990s?',
    tone: DUST[1],
  },
  {
    id: 'warming',
    topic: 'science',
    prompt: 'Global temperature anomaly since 1880 — when did the slope get steep?',
    tone: DUST[2],
  },
  {
    id: 'treasuries',
    topic: 'world',
    prompt: 'Foreign holders of US Treasuries — did China keep selling after 2015?',
    tone: DUST[5],
  },
  {
    id: 'patents',
    topic: 'tech',
    prompt: 'Patent filings by origin — when did China overtake the US?',
    tone: DUST[6],
  },
  {
    id: 'remittances',
    topic: 'world',
    prompt: 'Remittances received as a share of GDP — which countries live on money from abroad?',
    tone: DUST[0],
  },
  {
    id: 'grain',
    topic: 'world',
    prompt: 'Wheat and coarse grain exports by country — how much of the breadbasket is a handful of states?',
    tone: DUST[3],
  },
  {
    id: 'water',
    topic: 'earth',
    prompt: 'Freshwater withdrawal versus renewable supply by country — who is already overdrawn?',
    tone: DUST[4],
  },
  {
    id: 'launches',
    topic: 'science',
    prompt: 'Orbital launches per year by country — when did commercial US flights take over?',
    tone: DUST[6],
  },
  {
    id: 'dollar',
    topic: 'world',
    prompt: 'US dollar share of global FX reserves — how far has it slipped since 2000?',
    tone: DUST[5],
  },
  {
    id: 'robots',
    topic: 'tech',
    prompt: 'Robot density in manufacturing by country — how far ahead is South Korea?',
    tone: DUST[7],
  },
  {
    id: 'world-pop',
    topic: 'history',
    prompt: 'World population since 1800 — when did the curve actually go vertical?',
    tone: DUST[0],
  },
  {
    id: 'conflict-deaths',
    topic: 'history',
    prompt: 'Deaths in state-based armed conflicts since 1946 — did the post-Cold War peace actually hold?',
    tone: DUST[1],
  },
  {
    id: 'wars-toll',
    topic: 'history',
    prompt: 'Deadliest wars by death toll — is World War II still in a league of its own?',
    tone: DUST[7],
  },
  {
    id: 'child-mortality',
    topic: 'history',
    prompt: 'Under-five child mortality since 1800 — how far did the world actually fall?',
    tone: DUST[2],
  },
  {
    id: 'poverty',
    topic: 'history',
    prompt: 'Share of the world in extreme poverty — when did the drop actually steepen?',
    tone: DUST[3],
  },
  {
    id: 'literacy',
    topic: 'history',
    prompt: 'World adult literacy since 1820 — who taught the planet to read?',
    tone: DUST[4],
  },
  {
    id: 'democracy',
    topic: 'history',
    prompt: 'Electoral democracy index since 1900 — did the 20th century actually democratize?',
    tone: DUST[5],
  },
  {
    id: 'countries',
    topic: 'history',
    prompt: 'How many countries exist over time — when did decolonization show up in the count?',
    tone: DUST[6],
  },
  {
    id: 'urban',
    topic: 'history',
    prompt: 'Urban population share since 1950 — when did the world become majority city?',
    tone: DUST[1],
  },
  {
    id: 'world-gdp',
    topic: 'history',
    prompt: 'Global GDP over the long run — when did the hockey stick actually start?',
    tone: DUST[0],
  },
  {
    id: 'warheads',
    topic: 'science',
    prompt: 'Deployed strategic nuclear warheads by country — who still has the arsenal?',
    tone: DUST[7],
  },
  {
    id: 'transistors',
    topic: 'science',
    prompt: "Transistors per microprocessor since 1971 — did Moore's law actually hold?",
    tone: DUST[6],
  },
  {
    id: 'fertilizer-n',
    topic: 'science',
    prompt: 'Nitrogen fertilizer production since 1961 — how big did Haber-Bosch get?',
    tone: DUST[3],
  },
  {
    id: 'tb',
    topic: 'science',
    prompt: 'Tuberculosis death rate since 2000 — is the WHO curve still falling?',
    tone: DUST[2],
  },
  {
    id: 'species',
    topic: 'science',
    prompt: 'Number of described species by group — how many kinds of life have we actually named?',
    tone: DUST[5],
  },
  {
    id: 'methane',
    topic: 'science',
    prompt: 'Atmospheric methane concentration globally since 1984 — is CH₄ still climbing?',
    tone: DUST[4],
  },
];

export const PROMPT_LINES: readonly string[] = PROMPT_IDEAS.map((idea) => idea.prompt);

export function promptIdeaById(id: string): PromptIdea | undefined {
  return PROMPT_IDEAS.find((idea) => idea.id === id);
}
