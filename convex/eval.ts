import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

const slice = v.object({
  key: v.string(),
  n: v.number(),
  passed: v.number(),
  rate: v.number(),
});

const rec = v.object({
  id: v.string(),
  kind: v.string(),
  claim: v.string(),
  evidence: v.string(),
  examplePromptIds: v.array(v.string()),
  suggestedChange: v.string(),
});

const fail = v.object({
  promptId: v.string(),
  model: v.string(),
  seed: v.number(),
  issues: v.array(v.string()),
  prompt: v.string(),
});

const record = {
  runId: v.string(),
  kind: v.string(),
  models: v.array(v.string()),
  repeats: v.number(),
  n: v.number(),
  passed: v.number(),
  rate: v.number(),
  byStyle: v.array(slice),
  bySituation: v.array(slice),
  byModel: v.array(slice),
  byDomain: v.array(slice),
  byIssue: v.array(v.object({ code: v.string(), n: v.number() })),
  brittle: v.array(v.object({ promptId: v.string(), model: v.string() })),
  recs: v.array(rec),
  fails: v.array(fail),
};

export const recordRun = mutation({
  args: {
    secret: v.string(),
    ...record,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    await ctx.db.insert('evalRuns', {
      runId: args.runId,
      kind: args.kind,
      models: args.models,
      repeats: args.repeats,
      n: args.n,
      passed: args.passed,
      rate: args.rate,
      byStyle: args.byStyle,
      bySituation: args.bySituation,
      byModel: args.byModel,
      byDomain: args.byDomain,
      byIssue: args.byIssue,
      brittle: args.brittle,
      recs: args.recs,
      fails: args.fails,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const latest = query({
  args: { secret: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      ...record,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const row = await ctx.db.query('evalRuns').withIndex('by_created').order('desc').first();
    if (!row) {
      return null;
    }
    return {
      runId: row.runId,
      kind: row.kind,
      models: row.models,
      repeats: row.repeats,
      n: row.n,
      passed: row.passed,
      rate: row.rate,
      byStyle: row.byStyle,
      bySituation: row.bySituation,
      byModel: row.byModel,
      byDomain: row.byDomain,
      byIssue: row.byIssue,
      brittle: row.brittle,
      recs: row.recs,
      fails: row.fails,
      createdAt: row.createdAt,
    };
  },
});
