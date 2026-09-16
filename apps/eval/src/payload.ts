import { aggregateRun } from './aggregate';
import { recommendFromRun } from './recommend';
import type { EvalRec, EvalRun, SliceRate } from './types';

const FAIL_CAP = 40;

export type EvalFail = {
  promptId: string;
  model: string;
  seed: number;
  issues: string[];
  prompt: string;
};

export type EvalPayload = {
  runId: string;
  kind: 'canned' | 'compose';
  models: string[];
  repeats: number;
  n: number;
  passed: number;
  rate: number;
  byStyle: SliceRate[];
  bySituation: SliceRate[];
  byModel: SliceRate[];
  byDomain: SliceRate[];
  byIssue: Array<{ code: string; n: number }>;
  brittle: Array<{ promptId: string; model: string }>;
  recs: EvalRec[];
  fails: EvalFail[];
};

export function payloadFromRun(run: EvalRun): EvalPayload {
  const stats = aggregateRun(run);
  const fails: EvalFail[] = [];
  for (const row of run.cases) {
    if (row.pass) {
      continue;
    }
    fails.push({
      promptId: row.promptId,
      model: row.model,
      seed: row.seed,
      issues: row.issues.map((issue) => issue.code),
      prompt: row.prompt.prompt,
    });
    if (fails.length >= FAIL_CAP) {
      break;
    }
  }
  return {
    runId: run.id,
    kind: run.kind,
    models: run.models,
    repeats: run.repeats,
    n: stats.n,
    passed: stats.passed,
    rate: stats.rate,
    byStyle: stats.byStyle,
    bySituation: stats.bySituation,
    byModel: stats.byModel,
    byDomain: stats.byDomain,
    byIssue: stats.byIssue,
    brittle: stats.brittle.map((cell) => ({ promptId: cell.promptId, model: cell.model })),
    recs: recommendFromRun(run, stats),
    fails,
  };
}
