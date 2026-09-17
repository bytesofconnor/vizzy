import { generateText, Output } from 'ai';
import { z } from 'zod';
import { isAiGatewayConfigured } from './ai-gateway';
import { HINT_MODEL } from './ai-models';
import { logAiFromResult } from './ai-usage';
import { GATEWAY_NO_RETRY } from './gateway-errors';
import { fallbackHeroIdeas, isHeroIdeaBatch, parseHeroIdeas, type HeroIdea } from './hero-ideas';

const FAMILIES = ['noaa', 'usgs', 'fred', 'worldbank', 'wiki', 'owid'] as const;

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

Stay in history, geography, biodiversity, ecology, biology, chemistry, physics, geopolitics, economics, technology, energy, and climate-as-power. The reader should feel smarter after one glance.

Each chip must be a different SUBJECT. Do not put two ice, quake, grain, water, forest, unemployment, inflation, fertility, GDP, chip, refugee, or UN-vote ideas in the same batch. Mix countries. Mix centuries.

Prefer official families Vizzy can resolve, but do not default to the same five series every time. Cover at least four families, and include at least five of these less-worn numbers:
world population, conflict deaths, deadliest wars, child mortality, extreme poverty, literacy, democracy, number of countries, urbanization, global GDP long run, nuclear warheads, transistors / Moore's law, nitrogen fertilizer, tuberculosis, described species, atmospheric methane, forest cover, Living Planet Index, plastic to ocean, wild tigers, water stress.

Canonical series (Mauna Loa CO₂, ozone, Fed funds, CPI, unemployment, fertility, GDP per capita, Taiwan chips, refugees, UN votes) are allowed at most TWO chips total in a batch.

Never: movies, box office, museums, concerts, vinyl, streaming, Eurovision, sports records, art auctions, celebrity, pets, food lists.

The chip label is the bait. A serious curiosity, not a dataset name.
label: 4–8 words, sentence case. First word capital, the rest lowercase except proper nouns (Mauna Loa, Taiwan, Fed, CPI, CO₂, US, China, LNG). No period, no quotes.
Good: "Who actually mines the lithium"
Good: "Is the dollar share slipping"
Good: "Who is launching the satellites"
Bad: "Ozone hole" "Box office" "Arctic sea ice extent each summer" (too dataset-y)
prompt: one juicy sentence they would type, 80–180 characters. Put the hook in the label AND the nouns a source matcher needs.
Never pie, map, heatmap, pictogram, or a private company dashboard.
Never repeat anything listed under AVOID.`;

const RESHUFFLE = `RESHUFFLE: AVOID is recent chips. Switch subject, country, AND series. Surprise is required. If AVOID already had sea ice, quakes, grain, or water stress, do not use those nouns again.`;

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
    const avoid = exclude.length > 0 ? `\n\nAVOID:\n${exclude.slice(0, 80).join('\n')}` : '';
    const spice = salt ? `\n\nBatch spice: ${salt.slice(0, 32)}. Surprise me.` : '';
    const extra = reshuffle ? `\n\n${RESHUFFLE}` : '';
    const result = await generateText({
      model: HINT_MODEL,
      output: Output.object({ schema: IdeaSchema }),
      system: SYSTEM,
      prompt: `Invent eight to ten fresh chart prompts.${avoid}${spice}${extra}`,
      maxOutputTokens: 1200,
      maxRetries: GATEWAY_NO_RETRY,
    });
    await logAiFromResult('hero_ideas', HINT_MODEL, result.usage, result.totalUsage);
    const cleaned = parseHeroIdeas(result.output.ideas);
    return isHeroIdeaBatch(cleaned) ? cleaned : [];
  } catch (error) {
    console.error('hero ideas failed', error);
    return [];
  }
}
