import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isOwnerWallet(wallet: Doc<'wallets'> | null): boolean {
  if (!wallet) {
    return false;
  }
  const owners = ownerEmails();
  if (owners.length === 0) {
    return false;
  }
  const email = wallet.email?.toLowerCase();
  const googleEmail = wallet.googleEmail?.toLowerCase();
  return Boolean(
    (email && owners.includes(email)) || (googleEmail && owners.includes(googleEmail))
  );
}

async function walletByToken(ctx: QueryCtx | MutationCtx, token: string) {
  return await ctx.db
    .query('wallets')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique();
}

async function recStateById(ctx: QueryCtx | MutationCtx, recId: string) {
  return await ctx.db
    .query('evalRecStates')
    .withIndex('by_rec', (q) => q.eq('recId', recId))
    .unique();
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

const recWithLoop = v.object({
  id: v.string(),
  kind: v.string(),
  claim: v.string(),
  evidence: v.string(),
  examplePromptIds: v.array(v.string()),
  suggestedChange: v.string(),
  loop: v.union(v.literal('open'), v.literal('working'), v.literal('wont')),
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
    const previous = await ctx.db.query('evalRuns').withIndex('by_created').order('desc').first();
    const previousIds = previous?.recs.map((row) => row.id) ?? [];
    const nextIds = new Set(args.recs.map((row) => row.id));
    const clearedRecIds = previousIds.filter((id) => !nextIds.has(id));
    for (const recId of clearedRecIds) {
      const state = await recStateById(ctx, recId);
      if (state) {
        await ctx.db.delete(state._id);
      }
    }
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
      clearedRecIds,
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
      recs: v.array(recWithLoop),
      createdAt: v.number(),
      clearedRecIds: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const row = await ctx.db.query('evalRuns').withIndex('by_created').order('desc').first();
    if (!row) {
      return null;
    }
    const recs: Array<{
      id: string;
      kind: string;
      claim: string;
      evidence: string;
      examplePromptIds: string[];
      suggestedChange: string;
      loop: 'open' | 'working' | 'wont';
    }> = [];
    for (const item of row.recs) {
      const state = await recStateById(ctx, item.id);
      recs.push({
        ...item,
        loop: state?.status ?? 'open',
      });
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
      recs,
      fails: row.fails,
      createdAt: row.createdAt,
      clearedRecIds: row.clearedRecIds ?? [],
    };
  },
});

export const setRecStatus = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    recId: v.string(),
    status: v.union(v.literal('open'), v.literal('working'), v.literal('wont')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await walletByToken(ctx, args.walletToken);
    if (!isOwnerWallet(wallet)) {
      throw new Error('Unauthorized');
    }
    const existing = await recStateById(ctx, args.recId);
    if (args.status === 'open') {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status, updatedAt: Date.now() });
      return null;
    }
    await ctx.db.insert('evalRecStates', {
      recId: args.recId,
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});
