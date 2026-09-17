import { describe, expect, it } from 'vitest';
import { matchPrompt } from './catalog';
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
