import { DUST } from './theme';

export type PromptTopic =
  | 'culture'
  | 'nature'
  | 'earth'
  | 'world'
  | 'science'
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
];

export const PROMPT_LINES: readonly string[] = PROMPT_IDEAS.map((idea) => idea.prompt);

export function promptIdeaById(id: string): PromptIdea | undefined {
  return PROMPT_IDEAS.find((idea) => idea.id === id);
}
