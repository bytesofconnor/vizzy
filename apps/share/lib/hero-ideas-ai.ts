import { generateText, Output } from 'ai';
import { z } from 'zod';
import { isAiGatewayConfigured } from './ai-gateway';
import { HINT_MODEL } from './ai-models';
import { logAiFromResult } from './ai-usage';
import { fallbackHeroIdeas, isHeroIdeaBatch, parseHeroIdeas, type HeroIdea } from './hero-ideas';

const FAMILIES = ['noaa', 'usgs', 'fred', 'worldbank', 'wiki'] as const;

const IdeaSchema = z.object({
  ideas: z
    .array(
      z.object({
        label: z.string().describe('4 to 8 words, sentence case, a curiosity hook not a topic name'),
        prompt: z.string().describe('The full question the user would type'),
        family: z.enum(FAMILIES),
      })
    )
    .min(8)
    .max(10),
});

const SYSTEM = `You invent 8 to 10 chart prompts for Vizzy. Vizzy draws bar, line, or scatter from a public series. Humans type these; there is no voice API.

Stay in geography, geopolitics, economics, technology, energy, and climate-as-power. The reader should feel smarter after one glance, not entertained.

Prefer official families that Vizzy can actually resolve. Cover all five families at least once:
- fred: U.S. unemployment, CPI/inflation, federal funds rate, payrolls, housing starts, industrial production
- worldbank: GDP per capita, fertility, electricity access, merchandise trade, CO₂ by country, population
- wiki: languages by speakers, UN votes, semiconductor capacity, oil producers, military spending, aging populations
- noaa: Mauna Loa CO₂, Antarctic ozone hole, Arctic sea ice, global temperature anomaly
- usgs: strongest earthquakes by place (geography, not trivia)

Never: movies, box office, museums, concerts, vinyl, streaming, Eurovision, sports records, art auctions, celebrity, pets, food lists.

The chip label is the bait. A serious curiosity, not a dataset name.
label: 4–8 words, sentence case. First word capital, the rest lowercase except proper nouns (Mauna Loa, Taiwan, Fed, CPI, CO₂, US, China). No period, no quotes.
Good: "How much of the chips Taiwan makes"
Good: "Who stopped having enough children"
Good: "Which US recoveries never brought jobs back"
Good: "Who actually hosts the most refugees"
Bad: "Ozone hole" "Box office" "Which museums never got their crowds back" "When vinyl beat CDs again"
prompt: one juicy sentence they would type, 80–180 characters. Put the hook in the label AND the nouns a source matcher needs (federal funds, unemployment, fertility, GDP per capita, Taiwan chips, UN votes).
Never pie, map, heatmap, pictogram, or a private company dashboard.
Never repeat anything listed under AVOID.`;

const RESHUFFLE = `RESHUFFLE: AVOID is the last batch. Switch subject, country, AND series. Do not recycle unemployment, CPI, Fed funds, fertility, GDP per capita, Taiwan chips, refugees, or UN votes unless they are absent from AVOID.

Reach for the weirder official number people argue about: rare earths, naval fleets, lithium, dollar reserves, strait traffic, semiconductor equipment, grain exporters, Arctic shipping, desalination, data-center power, undersea cables, water stress, container throughput, uranium, satellite launches, gold reserves, youth unemployment, housing starts vs permits, LNG exporters, tank production, passport mobility, aging, desertification.

Labels should feel like a magazine hook, still 4–8 words. Surprise is required.`;

export async function heroIdeasForHome(
  exclude: readonly string[] = [],
  salt = '',
  reshuffle = false
): Promise<HeroIdea[]> {
  const avoided = exclude.map((item) => item.trim()).filter((item) => item.length >= 8);
  const ai = await aiHeroIdeas(avoided, salt, reshuffle);
  if (isHeroIdeaBatch(ai)) {
    return ai;
  }
  return fallbackHeroIdeas(avoided, salt || 'fallback');
}

async function aiHeroIdeas(exclude: string[], salt: string, reshuffle: boolean): Promise<HeroIdea[]> {
  if (!isAiGatewayConfigured()) {
    return [];
  }
  try {
    const avoid = exclude.length > 0 ? `\n\nAVOID:\n${exclude.slice(0, 48).join('\n')}` : '';
    const spice = salt ? `\n\nBatch spice: ${salt.slice(0, 32)}. Surprise me.` : '';
    const extra = reshuffle ? `\n\n${RESHUFFLE}` : '';
    const result = await generateText({
      model: HINT_MODEL,
      output: Output.object({ schema: IdeaSchema }),
      system: SYSTEM,
      prompt: `Invent eight to ten fresh chart prompts.${avoid}${spice}${extra}`,
      maxOutputTokens: 1200,
    });
    await logAiFromResult('hero_ideas', HINT_MODEL, result.usage, result.totalUsage);
    const cleaned = parseHeroIdeas(result.output.ideas);
    return isHeroIdeaBatch(cleaned) ? cleaned : [];
  } catch (error) {
    console.error('hero ideas failed', error);
    return [];
  }
}
