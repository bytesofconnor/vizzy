import { foldAsked } from './normalize';

export function phraseIn(asked: string, phrase: string): boolean {
  const hay = foldAsked(asked);
  const needle = foldAsked(phrase);
  if (needle.length < 2) {
    return false;
  }
  const body = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${body}(?![a-z0-9])`).test(hay);
}

type Place = {
  entity: string;
  names: readonly string[];
  labels?: readonly string[];
};

function place(entity: string, names: readonly string[] = [], labels: readonly string[] = []): Place {
  return {
    entity,
    names: names.length > 0 ? names : [entity.toLowerCase()],
    ...(labels.length > 0 ? { labels } : {}),
  };
}

const PLACES: readonly Place[] = [
  place('United States', ['united states', 'u.s.', 'usa', 'us']),
  place('United Kingdom', ['united kingdom', 'britain', 'uk', 'u.k.']),
  place('China'),
  place('India'),
  place('Germany'),
  place('France'),
  place('Japan'),
  place('Nigeria'),
  place('Russia', ['russia'], ['Russian Federation']),
  place('South Korea', ['south korea', 'republic of korea'], ['Korea, Rep.']),
  place('North Korea', ['north korea'], ["Korea, Dem. People's Rep."]),
  place('Egypt', ['egypt'], ['Egypt, Arab Rep.']),
  place('Iran', ['iran'], ['Iran, Islamic Rep.']),
  place('Syria', ['syria'], ['Syrian Arab Republic']),
  place('Turkey', ['turkey', 'turkiye'], ['Turkiye']),
  place('Venezuela', ['venezuela'], ['Venezuela, RB']),
  place('Vietnam', ['vietnam', 'viet nam']),
  place('Czechia', ['czechia', 'czech republic']),
  place('Slovakia', ['slovakia'], ['Slovak Republic']),
  place('Laos', ['laos'], ['Lao PDR']),
  place('Kyrgyzstan', ['kyrgyzstan'], ['Kyrgyz Republic']),
  place('Cape Verde', ['cape verde', 'cabo verde']),
  place('Ivory Coast', ["cote d'ivoire", 'ivory coast']),
  place('Democratic Republic of the Congo', ['democratic republic of the congo', 'dr congo', 'drc'], ['Congo, Dem. Rep.']),
  place('Congo', ['republic of the congo'], ['Congo, Rep.']),
  place('Palestine', ['palestine'], ['West Bank and Gaza']),
  place('Hong Kong', ['hong kong'], ['Hong Kong SAR, China']),
  place('Taiwan'),
  place('Brazil'),
  place('Canada'),
  place('Mexico'),
  place('Australia'),
  place('Spain'),
  place('Italy'),
  place('Netherlands'),
  place('Sweden'),
  place('Norway'),
  place('Denmark'),
  place('Finland'),
  place('Poland'),
  place('Ukraine'),
  place('Switzerland'),
  place('Austria'),
  place('Belgium'),
  place('Portugal'),
  place('Greece'),
  place('Ireland'),
  place('Indonesia'),
  place('Pakistan'),
  place('Bangladesh'),
  place('Philippines'),
  place('Thailand'),
  place('Malaysia'),
  place('Singapore'),
  place('Argentina'),
  place('Chile'),
  place('Colombia'),
  place('Peru'),
  place('South Africa'),
  place('Kenya'),
  place('Ethiopia'),
  place('Ghana'),
  place('Morocco'),
  place('Algeria'),
  place('Tanzania'),
  place('Uganda'),
  place('Saudi Arabia'),
  place('Israel'),
  place('Iraq'),
  place('New Zealand'),
  place('Iceland'),
  place('Luxembourg'),
  place('Monaco'),
  place('Liechtenstein'),
  place('Bermuda'),
  place('Qatar'),
  place('United Arab Emirates', ['united arab emirates', 'uae']),
  place('Papua New Guinea', ['papua new guinea']),
  place('Guinea'),
  place('South Sudan', ['south sudan']),
  place('Sudan'),
  place('Niger'),
  place('Minneapolis'),
  place('Chicago'),
  place('Austin'),
  place('Denver'),
  place('Miami'),
];

function foldLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function placesInAsked(asked: string): string[] {
  const hay = foldAsked(asked);
  const needles = PLACES.flatMap((item) =>
    item.names.map((name) => ({ entity: item.entity, name: foldAsked(name) }))
  )
    .filter((item) => item.name.length >= 2)
    .sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name));
  const occupied = new Array<boolean>(hay.length).fill(false);
  const hits: Array<{ entity: string; at: number }> = [];
  for (const needle of needles) {
    const body = needle.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^a-z0-9])(${body})(?![a-z0-9])`, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(hay))) {
      const token = match[1] ?? '';
      const start = match.index + match[0].length - token.length;
      const end = start + token.length;
      if (occupied.slice(start, end).some(Boolean)) {
        continue;
      }
      for (let index = start; index < end; index += 1) {
        occupied[index] = true;
      }
      hits.push({ entity: needle.entity, at: start });
    }
  }
  hits.sort((a, b) => a.at - b.at);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const hit of hits) {
    if (seen.has(hit.entity)) {
      continue;
    }
    seen.add(hit.entity);
    out.push(hit.entity);
  }
  return out;
}

export function labelIsPlace(label: string, entity: string): boolean {
  const item = PLACES.find((place) => place.entity === entity);
  if (!item) {
    return foldLabel(label) === foldLabel(entity);
  }
  const keys = new Set([item.entity, ...(item.labels ?? []), ...item.names].map(foldLabel));
  return keys.has(foldLabel(label));
}
