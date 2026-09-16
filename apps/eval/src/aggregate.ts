import type { BrittleCell, EvalAggregate, EvalRun, IssueCode, SliceRate } from './types';

function rates(
  cases: EvalRun['cases'],
  keyFn: (row: EvalRun['cases'][number]) => string
): SliceRate[] {
  const groups = new Map<string, { n: number; passed: number }>();
  for (const row of cases) {
    const key = keyFn(row);
    const current = groups.get(key) ?? { n: 0, passed: 0 };
    current.n += 1;
    if (row.pass) {
      current.passed += 1;
    }
    groups.set(key, current);
  }
  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      n: value.n,
      passed: value.passed,
      rate: value.n === 0 ? 0 : value.passed / value.n,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function aggregateRun(run: EvalRun): EvalAggregate {
  const passed = run.cases.filter((row) => row.pass).length;
  const issueCounts = new Map<IssueCode, number>();
  for (const row of run.cases) {
    const seen = new Set<IssueCode>();
    for (const issue of row.issues) {
      if (seen.has(issue.code)) {
        continue;
      }
      seen.add(issue.code);
      issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1);
    }
  }

  const brittleMap = new Map<string, BrittleCell>();
  for (const row of run.cases) {
    const key = `${row.promptId}::${row.model}`;
    const current = brittleMap.get(key) ?? {
      promptId: row.promptId,
      model: row.model,
      passes: [],
    };
    current.passes[row.seed] = row.pass;
    brittleMap.set(key, current);
  }
  const brittle = [...brittleMap.values()].filter((cell) => {
    const values = cell.passes.filter((value) => value !== undefined);
    return values.includes(true) && values.includes(false);
  });

  return {
    n: run.cases.length,
    passed,
    rate: run.cases.length === 0 ? 0 : passed / run.cases.length,
    byStyle: rates(run.cases, (row) => row.prompt.style),
    bySituation: rates(run.cases, (row) => row.prompt.situation),
    byModel: rates(run.cases, (row) => row.model),
    byDomain: rates(run.cases, (row) => row.prompt.domain),
    byIssue: [...issueCounts.entries()]
      .map(([code, n]) => ({ code, n }))
      .sort((a, b) => b.n - a.n || a.code.localeCompare(b.code)),
    brittle,
  };
}
