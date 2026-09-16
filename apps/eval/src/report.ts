import { aggregateRun } from './aggregate';
import { recommendFromRun } from './recommend';
import type { EvalRun } from './types';

export type EvalReport = {
  run: Pick<EvalRun, 'id' | 'at' | 'kind' | 'models' | 'repeats'>;
  n: number;
  passed: number;
  rate: number;
  byStyle: ReturnType<typeof aggregateRun>['byStyle'];
  bySituation: ReturnType<typeof aggregateRun>['bySituation'];
  byModel: ReturnType<typeof aggregateRun>['byModel'];
  byDomain: ReturnType<typeof aggregateRun>['byDomain'];
  byIssue: ReturnType<typeof aggregateRun>['byIssue'];
  brittle: ReturnType<typeof aggregateRun>['brittle'];
  recs: ReturnType<typeof recommendFromRun>;
};

export function reportFromRun(run: EvalRun): EvalReport {
  const stats = aggregateRun(run);
  return {
    run: {
      id: run.id,
      at: run.at,
      kind: run.kind,
      models: run.models,
      repeats: run.repeats,
    },
    n: stats.n,
    passed: stats.passed,
    rate: stats.rate,
    byStyle: stats.byStyle,
    bySituation: stats.bySituation,
    byDomain: stats.byDomain,
    byModel: stats.byModel,
    byIssue: stats.byIssue,
    brittle: stats.brittle,
    recs: recommendFromRun(run, stats),
  };
}

export function formatReportText(report: EvalReport): string {
  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
  const lines = [
    `Eval ${report.run.id} · ${report.run.kind} · ${report.passed}/${report.n} pass (${pct(report.rate)})`,
    `Models: ${report.run.models.join(', ')} · repeats: ${report.run.repeats}`,
    '',
    'By style',
    ...report.byStyle.map((row) => `  ${row.key}: ${pct(row.rate)} (${row.passed}/${row.n})`),
    '',
    'By situation',
    ...report.bySituation.map((row) => `  ${row.key}: ${pct(row.rate)} (${row.passed}/${row.n})`),
    '',
    'By model',
    ...report.byModel.map((row) => `  ${row.key}: ${pct(row.rate)} (${row.passed}/${row.n})`),
    '',
    `Brittle cells: ${report.brittle.length}`,
    '',
    'Recommendations (drafts — do not auto-merge)',
    ...report.recs.map(
      (rec) => `  [${rec.kind}] ${rec.claim}\n    ${rec.evidence}\n    → ${rec.suggestedChange}`
    ),
  ];
  return lines.join('\n');
}
