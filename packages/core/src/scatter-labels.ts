const FAMOUS = ['United States', 'China', 'India', 'Japan', 'Nigeria'];

export type NamedPoint = { name: string; x: number; y: number };

export function notableScatterNames(points: NamedPoint[]): string[] {
  const named = points.filter((point) => point.name.trim().length > 0 && Number.isFinite(point.x) && Number.isFinite(point.y));
  const picked: string[] = [];
  const add = (name: string | undefined) => {
    if (!name || picked.includes(name) || picked.length >= 6) {
      return;
    }
    picked.push(name);
  };
  for (const name of FAMOUS) {
    if (named.some((point) => point.name === name)) {
      add(name);
    }
  }
  const byY = [...named].sort((a, b) => b.y - a.y);
  add(byY[0]?.name);
  add(byY[byY.length - 1]?.name);
  return picked;
}

export function isGdpPerPerson(label: string | undefined): boolean {
  return /gdp per capita|gdp per person|usd per person/i.test(label ?? '');
}

export function isLifeYears(label: string | undefined): boolean {
  const text = (label ?? '').trim();
  return /^years$/i.test(text) || /life expectancy/i.test(text);
}

export function gdpLifeScatter(xLabel: string | undefined, yLabel: string | undefined): boolean {
  return isGdpPerPerson(xLabel) && isLifeYears(yLabel);
}
