import type { EvalAggregate, EvalRec, EvalRun, IssueCode } from './types';

function idsForIssue(run: EvalRun, code: IssueCode): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of run.cases) {
    if (!row.issues.some((issue) => issue.code === code)) {
      continue;
    }
    if (seen.has(row.promptId)) {
      continue;
    }
    seen.add(row.promptId);
    ids.push(row.promptId);
    if (ids.length >= 4) {
      break;
    }
  }
  return ids;
}

function sliceRate(slices: EvalAggregate['byStyle'], key: string): number | undefined {
  return slices.find((row) => row.key === key)?.rate;
}

/**
 * Deterministic recs from aggregates — the admin briefing without a second model.
 * Safe to snapshot in tests. A later LLM pass can paraphrase these claims.
 */
export function recommendFromRun(run: EvalRun, stats: EvalAggregate): EvalRec[] {
  const recs: EvalRec[] = [];

  const placeholderIds = idsForIssue(run, 'PLACEHOLDER_X');
  if (placeholderIds.length > 0) {
    recs.push({
      id: 'placeholders',
      kind: 'system',
      claim: 'Some drafts still use Country A / rank-index x labels',
      evidence: `${placeholderIds.length} prompt(s) failed PLACEHOLDER_X`,
      examplePromptIds: placeholderIds,
      suggestedChange:
        'Keep the SYSTEM rule: x is a real name from the question, never Country A or Rank 1. Add a fixture that fails on placeholders.',
    });
  }

  const urlIds = idsForIssue(run, 'INVENTED_URL');
  const pretendIds = idsForIssue(run, 'LOOKUP_MISS_PRETENDS_PUBLISHED');
  if (urlIds.length > 0 || pretendIds.length > 0) {
    recs.push({
      id: 'honest-miss',
      kind: 'system',
      claim: 'Lookup misses are still dressed up as published series',
      evidence: `${urlIds.length} invented URL(s), ${pretendIds.length} pretend official/scraped`,
      examplePromptIds: [...new Set([...urlIds, ...pretendIds])].slice(0, 4),
      suggestedChange:
        'On lookup fail: sourceMethod estimate, no URL, evidence says lookup failed. Fixture: lookup_miss must not compile with a URL.',
    });
  }

  const pastedIds = idsForIssue(run, 'PASTED_NUMBERS_IGNORED');
  if (pastedIds.length > 0) {
    recs.push({
      id: 'pasted-table',
      kind: 'fixture',
      claim: 'Pasted numbers are getting replaced',
      evidence: `${pastedIds.length} prompt(s) failed PASTED_NUMBERS_IGNORED`,
      examplePromptIds: pastedIds,
      suggestedChange: 'Fixture: when expectedYs are present, y must match. SYSTEM already says use the user table.',
    });
  }

  const typeIds = idsForIssue(run, 'TYPE_MISMATCH');
  if (typeIds.length > 0) {
    recs.push({
      id: 'type-fit',
      kind: 'fixture',
      claim: 'Time-like series sometimes land as bars (or rankings as lines)',
      evidence: `${typeIds.length} prompt(s) failed TYPE_MISMATCH`,
      examplePromptIds: typeIds,
      suggestedChange: 'Fixture on time__lookup_hit expecting line. Optional rewriter: time family → line.',
    });
  }

  const slang = sliceRate(stats.byStyle, 'short');
  if (slang !== undefined && slang < 0.85) {
    recs.push({
      id: 'short-rewrite',
      kind: 'rewriter',
      claim: 'Short / slang prompts are weaker than the rest of the grid',
      evidence: `short pass rate ${(slang * 100).toFixed(0)}% (n in byStyle)`,
      examplePromptIds: run.cases
        .filter((row) => row.prompt.style === 'short' && !row.pass)
        .map((row) => row.promptId)
        .filter((id, i, all) => all.indexOf(id) === i)
        .slice(0, 4),
      suggestedChange:
        'Log-only serializer: expand slang into a time or ranking family before compose. Do not ship until two batches agree.',
    });
  }

  if (stats.brittle.length > 0) {
    recs.push({
      id: 'brittle-repeats',
      kind: 'fixture',
      claim: 'Some cells flip pass/fail across seeds — luck, not a stable skill',
      evidence: `${stats.brittle.length} prompt×model pair(s) disagreed on repeats`,
      examplePromptIds: [...new Set(stats.brittle.map((cell) => cell.promptId))].slice(0, 4),
      suggestedChange: 'Treat brittle cells as fixtures. Do not change the default model based on a single seed.',
    });
  }

  const models = stats.byModel;
  if (models.length >= 2) {
    const ranked = [...models].sort((a, b) => b.rate - a.rate);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    if (best && worst && best.key !== worst.key && best.rate - worst.rate >= 0.05) {
      recs.push({
        id: 'model-gap',
        kind: 'model_routing',
        claim: `${best.key} beats ${worst.key} on this grid`,
        evidence: `${best.key} ${(best.rate * 100).toFixed(0)}% vs ${worst.key} ${(worst.rate * 100).toFixed(0)}%`,
        examplePromptIds: [],
        suggestedChange:
          'Do not flip the production default from one batch. Re-run the same 24 prompts. Route only the situation the challenger wins, if any.',
      });
    }
  }

  return recs;
}
