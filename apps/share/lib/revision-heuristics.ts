import type { ChartSeed } from './seed';

function formatX(value: string | number): string {
  const text = String(value).trim();
  return text.length > 28 ? `${text.slice(0, 25)}…` : text;
}

function yWord(seed: ChartSeed): string {
  const label = seed.yLabel.trim();
  if (!label || /^y$/i.test(label)) {
    return 'value';
  }
  return label.toLowerCase();
}

function uniquePrompts(prompts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of prompts) {
    const prompt = raw.trim().replace(/\s+/g, ' ');
    if (prompt.length < 8 || prompt.length > 120) {
      continue;
    }
    const key = prompt.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(prompt);
  }
  return out;
}

/** Fast, zero-cost prompts shown immediately while AI loads. */
export function heuristicRevisionPrompts(seed: ChartSeed): string[] {
  const rows = seed.rows;
  if (rows.length === 0) {
    return ['Make it a line chart.', 'Sort by value.', 'Drop the smallest bar.'];
  }

  const sorted = [...rows].sort((a, b) => b.y - a.y);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const prompts: string[] = [];

  if (!seed.printGrayscale) {
    prompts.push('Make it grayscale for print.');
  }

  if (seed.chartType === 'bar') {
    if (rows.length > 4) {
      prompts.push(`Sort by ${yWord(seed)}. Drop the bottom three.`);
    }
    if (rows.length > 6) {
      prompts.push(`Keep only the top five by ${yWord(seed)}.`);
    }
    prompts.push('Make it a line chart.');
  } else if (seed.chartType === 'line') {
    prompts.push('Switch to bars.');
    if (!seed.area) {
      prompts.push('Fill the area under the line.');
    }
  } else {
    prompts.push('Make it a bar chart instead.');
  }

  if (rows.length === 1) {
    prompts.push('Break this out by more categories.');
    prompts.push('Look up the latest numbers and add more rows.');
  } else if (rows.length <= 3) {
    prompts.push('Look up more rows so we can compare properly.');
  }

  if (top && rows.length > 3) {
    prompts.push(`Keep ${formatX(top.x)} and drop the rest.`);
  }

  if (bottom && rows.length > 5 && bottom.y > 0) {
    const floor = bottom.y < 10 ? bottom.y : Math.round(bottom.y);
    prompts.push(`Drop anything under ${floor}.`);
  }

  if (seed.xLabel && seed.xLabel.length > 2 && !/^x$/i.test(seed.xLabel)) {
    prompts.push(`Shorten the ${seed.xLabel.toLowerCase()} labels.`);
  }

  return uniquePrompts(prompts).slice(0, 5);
}
