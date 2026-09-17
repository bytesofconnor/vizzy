import { describe, expect, it } from 'vitest';
import { datasetsForTopic, matchPrompt, rankDatasets } from './catalog';
import { notesFromResolved, resolvePrompt } from './resolve';
import { parseFredCsv } from './parse/fred';
import { parseNoaaCo2 } from './parse/noaa';
import { parseUsgsGeojson } from './parse/usgs';
import { parseOwidCsv, parseOwidOzone } from './parse/owid';
import { parseWikiTables, parseWikiUnVotes } from './parse/wiki';
import { parseWorldBank } from './parse/worldbank';
import { downsample } from './window';

describe('matchPrompt', () => {
  it('routes homepage-shaped questions to a family', () => {
    expect(matchPrompt('Atmospheric CO₂ at Mauna Loa by decade')?.seriesId).toBe('co2_annmean_mlo');
    expect(matchPrompt('Strongest earthquakes since 2000 by magnitude')?.family).toBe('usgs');
    expect(matchPrompt('Top ten languages by native speakers')?.seriesId).toBe('languages_native');
    expect(matchPrompt('Life expectancy at birth by country')?.family).toBe('worldbank');
    expect(matchPrompt('US unemployment rate since 2019')?.seriesId).toBe('UNRATE');
    expect(
      matchPrompt('Antarctic ozone hole peak area by year since 1980 — can you see the Montreal Protocol working?')
        ?.seriesId
    ).toBe('ozone_hole_area');
    expect(
      matchPrompt('Refugees hosted by country today — who takes the most, relative to their own population?')?.seriesId
    ).toBe('refugees_hosted');
    expect(
      matchPrompt('UN General Assembly votes on Ukraine since 2022 — how many yes, no, and abstain each year?')
        ?.seriesId
    ).toBe('un_votes_ukraine');
    expect(
      matchPrompt('Share of advanced chips made in Taiwan vs the rest of the world — how concentrated is it?')
        ?.seriesId
    ).toBe('foundry_revenue');
    expect(
      matchPrompt('Solar electricity as a share of total generation — which countries crossed 10% first?')?.seriesId
    ).toBe('solar_share');
    expect(
      matchPrompt('Fertility rate by country since 1990 — who fell below replacement first, and who is still above?')
        ?.seriesId
    ).toBe('SP.DYN.TFRT.IN');
    expect(matchPrompt('GDP per capita by country since 2000 — who pulled away, and who got stuck?')?.seriesId).toBe(
      'NY.GDP.PCAP.CD'
    );
    expect(
      matchPrompt('Share of people with electricity by country — who closed the last big gaps after 2000?')?.seriesId
    ).toBe('EG.ELC.ACCS.ZS');
    expect(matchPrompt('Youth unemployment by country — who stayed stuck above 20% after 2015?')?.seriesId).toBe(
      'SL.UEM.1524.ZS'
    );
    expect(matchPrompt('Share of population aged 65+ by country — who crossed 20% first, and who is next?')?.seriesId).toBe(
      'SP.POP.65UP.TO.ZS'
    );
    expect(matchPrompt('Military spending as a share of GDP — who stayed on a war footing after 2014?')?.seriesId).toBe(
      'MS.MIL.XPND.GD.ZS'
    );
    expect(
      matchPrompt('Remittances received as a share of GDP — which countries live on money from abroad?')?.seriesId
    ).toBe('BX.TRF.PWKR.DT.GD.ZS');
    expect(
      matchPrompt('US housing starts versus permits since 2000 — which recoveries actually built houses?')?.seriesId
    ).toBe('HOUST');
    expect(matchPrompt('Global temperature anomaly since 1880 — when did the slope get steep?')?.seriesId).toBe(
      'temperature_anomaly'
    );
    expect(
      matchPrompt('Arctic sea ice September minimum since 1979 — when did the collapse actually steepen?')?.seriesId
    ).toBe('arctic_sea_ice');
    expect(matchPrompt('US wildfire acres burned by year — which seasons dwarf the 1990s?')?.seriesId).toBe(
      'us_wildfire_area'
    );
    expect(
      matchPrompt('Lithium mine production by country — how much of the battery metal still sits in Australia and Chile?')
        ?.seriesId
    ).toBe('lithium_production');
    expect(matchPrompt('Electric share of new car sales by country — who crossed 20% first?')?.seriesId).toBe('ev_share');
    expect(matchPrompt('Crude oil production by country — did the US shale boom actually take the crown?')?.seriesId).toBe(
      'oil_production'
    );
    expect(matchPrompt('Official gold reserves by country — who stacked bars after 2010, and who sold?')?.seriesId).toBe(
      'gold_reserves'
    );
    expect(
      matchPrompt('Freshwater withdrawal versus renewable supply by country — who is already overdrawn?')?.seriesId
    ).toBe('ER.H2O.FWTL.ZS');
    expect(matchPrompt('Share of land covered by forest — who is still a forest country?')?.seriesId).toBe('forest_share');
    expect(matchPrompt('Annual deforestation by country — who is still cutting the fastest?')?.seriesId).toBe(
      'deforestation'
    );
    expect(matchPrompt('Tree cover loss by country — who lost the most forest canopy?')?.seriesId).toBe('tree_cover_loss');
    expect(matchPrompt('Share of land in protected areas — who actually set habitat aside?')?.seriesId).toBe(
      'terrestrial_protected'
    );
    expect(matchPrompt('Marine protected area share — who actually closed the fishing grounds?')?.seriesId).toBe(
      'marine_protected'
    );
    expect(matchPrompt('Living Planet Index since 1970 — how far did vertebrate wildlife fall?')?.seriesId).toBe(
      'living_planet_index'
    );
    expect(matchPrompt('Share of fish stocks that are overexploited — did the FAO curve keep rising?')?.seriesId).toBe(
      'fish_overexploited'
    );
    expect(matchPrompt('Population density by country — who is actually the most crowded?')?.seriesId).toBe(
      'population_density'
    );
    expect(matchPrompt('Plastic waste emitted to the ocean by country — who is leaking the most?')?.seriesId).toBe(
      'plastic_ocean'
    );
    expect(matchPrompt('Deadliest volcanic eruptions since 1800 by lives lost — which century was worst?')?.seriesId).toBe(
      'volcano_deaths'
    );
    expect(
      matchPrompt('Wild tiger population by country today — where did they come back, and where did they vanish?')
        ?.seriesId
    ).toBe('wild_tigers');
    expect(
      matchPrompt('Named Atlantic hurricanes per decade since 1960 — are the busy seasons bunching together?')?.seriesId
    ).toBe('atlantic_hurricanes');
    expect(matchPrompt('World population since 1800 — when did the curve go vertical?')?.seriesId).toBe('world_population');
    expect(matchPrompt('Deaths in state-based armed conflicts since 1946 — did the post-Cold War peace actually hold?')?.seriesId).toBe(
      'conflict_deaths'
    );
    expect(matchPrompt('Deadliest wars by death toll — is World War II still in a league of its own?')?.seriesId).toBe(
      'wars_death_toll'
    );
    expect(matchPrompt('Under-five child mortality since 1800 — how far did the world actually fall?')?.seriesId).toBe(
      'child_mortality'
    );
    expect(matchPrompt('Share of the world in extreme poverty — when did the drop actually steepen?')?.seriesId).toBe(
      'extreme_poverty'
    );
    expect(matchPrompt('World adult literacy since 1820 — who taught the planet to read?')?.seriesId).toBe('literacy_rate');
    expect(matchPrompt('Electoral democracy index since 1900 — did the 20th century actually democratize?')?.seriesId).toBe(
      'democracy_index'
    );
    expect(matchPrompt('How many countries exist over time — when did decolonization show up in the count?')?.seriesId).toBe(
      'countries_count'
    );
    expect(matchPrompt('Urban population share since 1950 — when did the world become majority city?')?.seriesId).toBe(
      'urban_share'
    );
    expect(matchPrompt('Global GDP over the long run — when did the hockey stick actually start?')?.seriesId).toBe('world_gdp');
    expect(matchPrompt('Deployed strategic nuclear warheads by country — who still has the arsenal?')?.seriesId).toBe(
      'nuclear_warheads'
    );
    expect(matchPrompt("Transistors per microprocessor since 1971 — did Moore's law actually hold?")?.seriesId).toBe(
      'transistors'
    );
    expect(matchPrompt('Nitrogen fertilizer production since 1961 — how big did Haber-Bosch get?')?.seriesId).toBe(
      'nitrogen_fertilizer'
    );
    expect(matchPrompt('Tuberculosis death rate since 2000 — is the WHO curve still falling?')?.seriesId).toBe(
      'tuberculosis_deaths'
    );
    expect(matchPrompt('Number of described species by group — how many kinds of life have we actually named?')?.seriesId).toBe(
      'described_species'
    );
    expect(matchPrompt('Atmospheric methane concentration globally since 1984 — is CH₄ still climbing?')?.seriesId).toBe(
      'ch4_annmean_gl'
    );
  });

  it('does not keep culture leftovers', () => {
    expect(matchPrompt('Eurovision wins by country — is Ireland still the record holder?')).toBeNull();
    expect(matchPrompt("Men's Olympic 100m winning times since 1968")).toBeNull();
  });

  it('does not steal pasted tables or vague prompts', () => {
    expect(matchPrompt('chart this')).toBeNull();
    expect(matchPrompt('Jan 10\nFeb 12\nMar 9')).toBeNull();
    expect(matchPrompt('jobs at my startup by week')).toBeNull();
  });

  it('scores aliases instead of first-match predicates', () => {
    const ranked = rankDatasets('Youth unemployment by country — who stayed stuck above 20% after 2015?');
    expect(ranked[0]?.dataset.seriesId).toBe('SL.UEM.1524.ZS');
    expect(ranked.some((row) => row.dataset.seriesId === 'UNRATE')).toBe(false);
  });

  it('keeps datasets on topics so history is a shelf not a chart', () => {
    const history = datasetsForTopic('history').map((row) => row.seriesId);
    expect(history).toEqual(expect.arrayContaining(['world_population', 'literacy_rate', 'wars_death_toll']));
    expect(datasetsForTopic('chemistry').some((row) => row.seriesId === 'ch4_annmean_gl')).toBe(true);
  });
});

describe('parsers', () => {
  it('reads FRED csv', () => {
    const rows = parseFredCsv('DATE,UNRATE\n2019-01-01,4.0\n2019-02-01,3.8\n');
    expect(rows).toEqual([
      { x: '2019-01', y: 4 },
      { x: '2019-02', y: 3.8 },
    ]);
  });

  it('reads NOAA annual CO2', () => {
    const rows = parseNoaaCo2('# year mean\n1959  315.98  0.12\n1960  316.91  0.12\n');
    expect(rows[0]).toEqual({ x: '1959', y: 315.98 });
  });

  it('reads USGS geojson', () => {
    const rows = parseUsgsGeojson(
      JSON.stringify({
        features: [
          { properties: { mag: 9.1, place: 'Sumatra', time: Date.UTC(2004, 11, 26) } },
          { properties: { mag: 8.8, place: 'Chile', time: Date.UTC(2010, 1, 27) } },
        ],
      })
    );
    expect(rows[0]?.y).toBe(9.1);
    expect(rows[0]?.x).toContain('Sumatra');
  });

  it('reads OWID ozone hole km² as million km²', () => {
    const rows = parseOwidOzone(
      'Entity,Code,Year,Maximum hole area,Seasonal mean hole area\nWorld,OWID_WRL,1979,1100000,100000\nWorld,OWID_WRL,1980,3300000,1400000\n'
    );
    expect(rows).toEqual([
      { x: '1979', y: 1.1 },
      { x: '1980', y: 3.3 },
    ]);
  });

  it('reads an OWID world time series and a latest-year ranking', () => {
    const series = parseOwidCsv(
      'Entity,Code,Year,Average,Lower bound,Upper bound\nWorld,OWID_WRL,1880,-0.2,-0.3,-0.1\nWorld,OWID_WRL,1881,-0.1,-0.2,0\nNorthern Hemisphere,OWID_NH,1880,0.4,0.1,0.7\n',
      { slug: 'temperature-anomaly', value: /^Average$/i, entity: 'World' }
    );
    expect(series).toEqual([
      { x: '1880', y: -0.2 },
      { x: '1881', y: -0.1 },
    ]);
    const rank = parseOwidCsv(
      'Entity,Code,Year,Lithium Production\nWorld,OWID_WRL,2024,999999\nAustralia,AUS,2024,92000\nChile,CHL,2024,49000\nChina,CHN,2023,100\nChina,CHN,2024,41000\n',
      { slug: 'lithium-production', value: /Lithium Production/i, rank: true }
    );
    expect(rank.map((row) => row.x)).toEqual(['Australia', 'Chile', 'China']);
    const forest = parseOwidCsv(
      'Entity,Code,Year,Share of land covered by forest\nWorld,OWID_WRL,2023,31\nAfrica (FAO),,2023,22\nSuriname,SUR,2023,96\nFinland,FIN,2023,74\nBrazil,BRA,2023,59\n',
      { slug: 'forest-area-as-share-of-land-area', value: /^Share of land covered by forest$/i, rank: true }
    );
    expect(forest.map((row) => row.x)).toEqual(['Suriname', 'Finland', 'Brazil']);
    const species = parseOwidCsv(
      'Entity,Year,Number of described species\nAll groups,2025,2000000\nInsects,2025,1000000\nBirds,2025,11000\nMammals,2025,6500\n',
      { slug: 'number-of-described-species', value: /Number of described species/i, rank: true }
    );
    expect(species.map((row) => row.x)).toEqual(['Insects', 'Birds', 'Mammals']);
  });

  it('reads UNGA in-favour tallies', () => {
    const html = `
      <table class="wikitable">
        <tr><th>Vote</th><th>Tally</th></tr>
        <tr><td>In favour</td><td>141</td></tr>
        <tr><td>Against</td><td>5</td></tr>
      </table>
      <table class="wikitable">
        <tr><th>Vote</th><th>Tally</th></tr>
        <tr><td>In favour</td><td>140</td></tr>
      </table>`;
    expect(parseWikiUnVotes(html)).toEqual([
      { x: 'ES-11/1', y: 141 },
      { x: 'ES-11/2', y: 140 },
    ]);
  });

  it('reads a wikitable by headers', () => {
    const html = `
      <table class="wikitable">
        <tr><th>Language</th><th>Native speakers</th></tr>
        <tr><td>Mandarin</td><td>939</td></tr>
        <tr><td>Spanish</td><td>485</td></tr>
        <tr><td>English</td><td>380</td></tr>
      </table>`;
    const rows = parseWikiTables(html, {
      page: 'x',
      nameHeader: /language/i,
      valueHeader: /native/i,
    });
    expect(rows.map((row) => row.x)).toEqual(['Mandarin', 'Spanish', 'English']);
  });

  it('reads gold holdings from a wikitable', () => {
    const html = `
      <table class="wikitable">
        <tr><th>Rank</th><th>Country/Organization</th><th>Gold holdings (tonnes)</th></tr>
        <tr><td>1</td><td>United States</td><td>8,133</td></tr>
        <tr><td>2</td><td>Germany</td><td>3,352</td></tr>
        <tr><td>3</td><td>Italy</td><td>2,452</td></tr>
      </table>`;
    const rows = parseWikiTables(html, {
      page: 'Gold_reserve',
      nameHeader: /country/i,
      valueHeader: /holdings|tonnes/i,
    });
    expect(rows[0]).toEqual({ x: 'United States', y: 8133 });
  });

  it('reads a year series across several wikitables', () => {
    const html = `
      <table class="wikitable">
        <tr><th>Year</th><th>TS</th><th>H</th></tr>
        <tr><td>1960</td><td>7</td><td>4</td></tr>
        <tr><td>1961</td><td>11</td><td>8</td></tr>
      </table>
      <table class="wikitable">
        <tr><th>Year</th><th>TS</th><th>H</th></tr>
        <tr><td>2005</td><td>28</td><td>15</td></tr>
        <tr><td>1960</td><td>7</td><td>4</td></tr>
      </table>`;
    const rows = parseWikiTables(html, {
      page: 'List_of_Atlantic_hurricane_seasons',
      nameHeader: /^year$/i,
      valueHeader: /^h$/i,
      mode: 'year',
    });
    expect(rows).toEqual([
      { x: '1960', y: 4 },
      { x: '1961', y: 8 },
      { x: '2005', y: 15 },
    ]);
  });

  it('reads war death ranges as the low millions estimate', () => {
    const html = `
      <table class="wikitable">
        <tr><th>War</th><th>Death range</th><th>Date</th></tr>
        <tr><td>World War II</td><td>70–85 million</td><td>1939–1945</td></tr>
        <tr><td>Taiping Rebellion</td><td>20–70 million</td><td>1850–1864</td></tr>
        <tr><td>Mongol invasions</td><td>20–60 million</td><td>1206–1368</td></tr>
      </table>`;
    const rows = parseWikiTables(html, {
      page: 'List_of_wars_by_death_toll',
      nameHeader: /^war$/i,
      valueHeader: /death range/i,
    });
    expect(rows[0]).toEqual({ x: 'World War II', y: 70 });
  });

  it('reads World Bank latest-year countries', () => {
    const rows = parseWorldBank(
      JSON.stringify([
        {},
        [
          { country: { value: 'Japan' }, value: 84.5 },
          { country: { value: 'World' }, value: 72 },
          { country: { value: 'Spain' }, value: 83.2 },
        ],
      ])
    );
    expect(rows.map((row) => row.x)).toEqual(['Japan', 'Spain']);
  });
});

describe('resolvePrompt', () => {
  it('windows FRED since a year and writes compose notes', async () => {
    const csv = ['DATE,UNRATE', '2018-01-01,4.0', '2019-06-01,3.6', '2020-01-01,3.5'].join('\n');
    const series = await resolvePrompt('US unemployment rate since 2019', {
      get: async () => csv,
      now: Date.UTC(2026, 0, 1),
    });
    expect(series?.rows.map((row) => row.x)).toEqual(['2019-06', '2020-01']);
    expect(notesFromResolved(series!)).toContain('sourceMethod official');
    expect(notesFromResolved(series!)).toContain('fred.stlouisfed.org');
  });

  it('downsamples long series', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ x: String(1900 + i), y: i }));
    const slim = downsample(rows, 24);
    expect(slim).toHaveLength(24);
    expect(slim[0]?.x).toBe('1900');
    expect(slim[23]?.x).toBe('1999');
  });
});
