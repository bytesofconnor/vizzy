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
];

export const PROMPT_LINES: readonly string[] = PROMPT_IDEAS.map((idea) => idea.prompt);

export function promptIdeaById(id: string): PromptIdea | undefined {
  return PROMPT_IDEAS.find((idea) => idea.id === id);
}
