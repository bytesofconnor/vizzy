import { resolvePrompt } from '../src/resolve';

const prompts = ['US GDP since 2000', 'unemployment rate by US state'] as const;

for (let run = 0; run < 5; run += 1) {
  for (const prompt of prompts) {
    const started = performance.now();
    const series = await resolvePrompt(prompt);
    const ms = Math.round(performance.now() - started);
    const labels = series?.rows.map((row) => String(row.x)) ?? [];
    if (prompt === 'US GDP since 2000') {
      if (series?.seriesId !== 'GDPCA' || labels[0] !== '2000' || labels.length < 20) {
        throw new Error(`GDP resolve missed the series: ${series?.seriesId} ${labels.length}`);
      }
    }
    if (prompt === 'unemployment rate by US state') {
      const names = new Set(labels);
      if (series?.seriesId !== 'state_unemployment' || names.size !== 50 || !names.has('New Jersey')) {
        throw new Error(`state resolve missed rows: ${series?.seriesId} ${names.size}`);
      }
    }
    console.log(
      JSON.stringify({
        run,
        prompt,
        ms,
        seriesId: series?.seriesId ?? null,
        rows: series?.rows.length ?? 0,
        first: labels[0] ?? null,
        last: labels.at(-1) ?? null,
      })
    );
  }
}
