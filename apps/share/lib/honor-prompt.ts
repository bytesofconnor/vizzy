const TIME_GRAIN = /\b(per year|each year|every year|by year|year by year|since \d{4})\b/i;
const REPEATED_YEARS = /\b(per year|each year|every year|by year|year by year)\b/i;

export type HonorRows = Array<{ x: string | number }>;

export type HonorInput = {
  asked: string;
  title: string;
  xLabel: string;
  yLabel: string;
  rows: HonorRows;
  note?: string;
  sourceLabel?: string;
  notes?: string;
};

type Needs = {
  newCapacity: boolean;
  countryRanking: boolean;
  singleYear: boolean;
};

export function honestTitle(input: HonorInput): string {
  const needs = readNeeds(input);
  if (!needs.newCapacity && !needs.countryRanking && !needs.singleYear) {
    return input.title;
  }
  if (alreadyHonest(input.title, needs)) {
    return input.title;
  }
  return buildTitle(input, needs);
}

function readNeeds(input: HonorInput): Needs {
  const header = tableHeader(input.notes);
  const direct = `${input.yLabel}\n${input.note ?? ''}\n${input.sourceLabel ?? ''}`;
  const axisNew =
    !installedStock(input.yLabel) &&
    (newCapacityText(input.yLabel) || (newCapacityText(header) && !/\binstalled\b/i.test(header)));
  const proseNew =
    askedInstalled(input.asked) &&
    !installedStock(input.yLabel) &&
    (newCapacityText(direct) || (newCapacityText(header) && !/\binstalled\b/i.test(header)));
  const newCapacity =
    (axisNew || proseNew) &&
    (!titleNamesNewCapacity(input.title) || /\binstalled\b/i.test(input.title));
  const yearSeries = isMultiYearSeries(input.rows);
  const categories = isCategoryChart(input.rows);
  const countryAxis = /\bcountr/i.test(input.xLabel);
  const wantsTime = TIME_GRAIN.test(input.asked) || TIME_GRAIN.test(input.title);
  const byCountry = /\bby countr/i.test(input.asked);
  const repeated = REPEATED_YEARS.test(input.asked) || REPEATED_YEARS.test(input.title);
  return {
    newCapacity,
    countryRanking: categories && countryAxis && wantsTime && !byCountry && !yearSeries,
    singleYear: repeated && !yearSeries,
  };
}

function askedInstalled(asked: string): boolean {
  return /\binstalled\b/i.test(asked) || /\b(cumulative|total)\s+capacit/i.test(asked);
}

function installedStock(yLabel: string): boolean {
  return /\binstalled\b/i.test(yLabel) && !/\b(new|added|addition)\b/i.test(yLabel);
}

function newCapacityText(text: string): boolean {
  return (
    /\b(new capacity|added capacity|capacity added|additions|newly installed)\b/i.test(text) ||
    (/\b(new|added)\b/i.test(text) && /\bcapacit/i.test(text))
  );
}

function titleNamesNewCapacity(title: string): boolean {
  return (
    /\b(new capacity|added capacity|capacity additions|newly added|newly installed)\b/i.test(title) ||
    /\badditions\b/i.test(title)
  );
}

function isTimeX(value: string): boolean {
  const text = value.trim();
  if (/^(?:19|20)\d{2}$/.test(text)) {
    return true;
  }
  if (/^(?:19|20)\d{2}[-/.]\d{1,2}/.test(text)) {
    return true;
  }
  return /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
    text
  );
}

function isMultiYearSeries(rows: HonorRows): boolean {
  const years = rows.map((row) => String(row.x).trim()).filter((value) => /^(?:19|20)\d{2}$/.test(value));
  return new Set(years).size >= 2 && years.length >= Math.ceil(rows.length * 0.7);
}

function isCategoryChart(rows: HonorRows): boolean {
  if (rows.length < 2) {
    return false;
  }
  const categories = rows.filter((row) => !isTimeX(String(row.x)));
  return categories.length >= Math.ceil(rows.length * 0.7);
}

function tableHeader(notes: string | undefined): string {
  if (!notes) {
    return '';
  }
  const line = notes
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.includes('|') && !/^[-|:\s]+$/.test(row));
  return line ?? '';
}

function alreadyHonest(title: string, needs: Needs): boolean {
  const text = title.toLowerCase();
  if (needs.newCapacity && !titleNamesNewCapacity(title)) {
    return false;
  }
  if (needs.newCapacity && /\binstalled\b/i.test(title)) {
    return false;
  }
  if (needs.countryRanking && !text.includes('country ranking')) {
    return false;
  }
  if (needs.countryRanking && TIME_GRAIN.test(title)) {
    return false;
  }
  if (needs.singleYear && !text.includes('single year')) {
    return false;
  }
  if (needs.singleYear && REPEATED_YEARS.test(title)) {
    return false;
  }
  return true;
}

function buildTitle(input: HonorInput, needs: Needs): string {
  if (needs.newCapacity) {
    return newCapacityTitle(input);
  }
  const subject = seriesSubject(input);
  const year = singleDrawnYear(input);
  if (needs.countryRanking && needs.singleYear) {
    return year ? `Country ranking of ${subject}, single year ${year}` : `Country ranking of ${subject}, single year`;
  }
  if (needs.countryRanking) {
    return `Country ranking of ${subject}`;
  }
  if (needs.singleYear) {
    const name = subject.charAt(0).toUpperCase() + subject.slice(1);
    return year ? `${name}, single year ${year}` : `${name}, single year`;
  }
  return input.title;
}

function newCapacityTitle(input: HonorInput): string {
  const blob = `${input.asked}\n${input.title}\n${input.yLabel}`;
  const solar = /\bsolar\b/i.test(blob);
  const byCountry = /\bcountr/i.test(input.xLabel) || /\bby countr/i.test(`${input.asked} ${input.title}`);
  const head = solar ? 'New solar capacity' : 'New capacity';
  return [head, byCountry ? 'by country' : '', additionsYear(input)].filter(Boolean).join(' ');
}

function additionsYear(input: HonorInput): string {
  if (askedInstalled(input.asked)) {
    return '';
  }
  const years = [...new Set([...input.title.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]))];
  return years.length === 1 ? `in ${years[0]}` : '';
}

function seriesSubject(input: HonorInput): string {
  const blob = `${input.asked} ${input.yLabel}`;
  if (/\bsatellite|\blaunch/i.test(blob)) {
    return 'satellite launches';
  }
  if (/\bdeforest|forest lost|forest loss/i.test(blob)) {
    return 'forest loss';
  }
  const label = input.yLabel.trim();
  if (label && label.length <= 48 && !/^value$/i.test(label)) {
    return label.toLowerCase();
  }
  return 'this series';
}

function singleDrawnYear(input: HonorInput): string | undefined {
  const askYears = new Set([...input.asked.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]));
  const blob = [
    input.title,
    input.yLabel,
    input.note ?? '',
    input.sourceLabel ?? '',
    ...input.rows.map((row) => String(row.x)),
  ].join(' ');
  const years = [...new Set([...blob.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]))].filter(
    (year) => !askYears.has(year)
  );
  return years.length === 1 ? years[0] : undefined;
}
