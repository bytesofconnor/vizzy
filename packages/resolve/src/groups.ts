export const COUNTRY_GROUPS = {
  G7: ['Canada', 'France', 'Germany', 'Italy', 'Japan', 'United Kingdom', 'United States'],
  G20: [
    'Argentina',
    'Australia',
    'Brazil',
    'Canada',
    'China',
    'France',
    'Germany',
    'India',
    'Indonesia',
    'Italy',
    'Japan',
    'Mexico',
    'Russia',
    'Saudi Arabia',
    'South Africa',
    'South Korea',
    'Turkey',
    'United Kingdom',
    'United States',
  ],
  EU: [
    'Austria',
    'Belgium',
    'Bulgaria',
    'Croatia',
    'Cyprus',
    'Czechia',
    'Denmark',
    'Estonia',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hungary',
    'Ireland',
    'Italy',
    'Latvia',
    'Lithuania',
    'Luxembourg',
    'Malta',
    'Netherlands',
    'Poland',
    'Portugal',
    'Romania',
    'Slovakia',
    'Slovenia',
    'Spain',
    'Sweden',
  ],
  OECD: [
    'Australia',
    'Austria',
    'Belgium',
    'Canada',
    'Chile',
    'Colombia',
    'Costa Rica',
    'Czechia',
    'Denmark',
    'Estonia',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hungary',
    'Iceland',
    'Ireland',
    'Israel',
    'Italy',
    'Japan',
    'South Korea',
    'Latvia',
    'Lithuania',
    'Luxembourg',
    'Mexico',
    'Netherlands',
    'New Zealand',
    'Norway',
    'Poland',
    'Portugal',
    'Slovakia',
    'Slovenia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Turkey',
    'United Kingdom',
    'United States',
  ],
} as const;

export type CountryGroup = keyof typeof COUNTRY_GROUPS;

const GROUP_TOKENS: ReadonlyArray<{ group: CountryGroup; token: string }> = [
  { group: 'G20', token: 'g20' },
  { group: 'OECD', token: 'oecd' },
  { group: 'G7', token: 'g7' },
  { group: 'EU', token: 'eu' },
];

export function groupsInAsked(asked: string): CountryGroup[] {
  const hay = asked.toLowerCase();
  const found: Array<{ group: CountryGroup; at: number }> = [];
  for (const item of GROUP_TOKENS) {
    const re = new RegExp(`(?:^|[^a-z0-9])(${item.token})(?![a-z0-9])`, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(hay))) {
      const token = match[1] ?? '';
      const at = match.index + match[0].length - token.length;
      found.push({ group: item.group, at });
    }
  }
  found.sort((a, b) => a.at - b.at);
  const seen = new Set<CountryGroup>();
  const out: CountryGroup[] = [];
  for (const hit of found) {
    if (seen.has(hit.group)) {
      continue;
    }
    seen.add(hit.group);
    out.push(hit.group);
  }
  return out;
}

export function groupMembers(groups: readonly CountryGroup[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const entity of COUNTRY_GROUPS[group]) {
      if (seen.has(entity)) {
        continue;
      }
      seen.add(entity);
      out.push(entity);
    }
  }
  return out;
}
