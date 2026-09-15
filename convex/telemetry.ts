import { mutation, query, type QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAILS ?? '';
  return raw
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

async function walletByToken(ctx: QueryCtx, token: string) {
  return await ctx.db
    .query('wallets')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique();
}

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

function utcDayFrom(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const bumpEvent = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    day: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const name = args.name.trim().slice(0, 80);
    if (!name) {
      return null;
    }
    const existing = await ctx.db
      .query('eventDaily')
      .withIndex('by_name_day', (q) => q.eq('name', name).eq('day', args.day))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert('eventDaily', { name, day: args.day, count: 1 });
    }
    return null;
  },
});

export const logAiCall = mutation({
  args: {
    secret: v.string(),
    route: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    await ctx.db.insert('aiCalls', {
      route: args.route.slice(0, 80),
      model: args.model.slice(0, 120),
      inputTokens: Math.max(0, Math.round(args.inputTokens)),
      outputTokens: Math.max(0, Math.round(args.outputTokens)),
      createdAt: Date.now(),
    });
    return null;
  },
});

const insightRow = v.object({ label: v.string(), count: v.number() });

export const getInsights = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    now: v.number(),
  },
  returns: v.union(v.null(), v.object({
    people: v.number(),
    chartsDrawn: v.number(),
    composeCharts: v.number(),
    publishCharts: v.number(),
    purchases: v.number(),
    taps: v.array(insightRow),
    aiCalls: v.number(),
    aiInputTokens: v.number(),
    aiOutputTokens: v.number(),
    aiEstimateUsd: v.number(),
  })),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await walletByToken(ctx, args.walletToken);
    if (!isOwnerWallet(wallet)) {
      return null;
    }

    const windowStart = args.now - 30 * 24 * 60 * 60 * 1000;
    const windowDay = utcDayFrom(windowStart);

    const wallets = await ctx.db.query('wallets').collect();
    const people = wallets.filter((row) => Boolean(row.googleSub || row.email)).length;

    const uses = await ctx.db.query('uses').collect();
    const chartsDrawn = uses.filter((row) => row.createdAt >= windowStart).length;

    const charts = await ctx.db.query('charts').collect();
    const recentCharts = charts.filter((row) => row.createdAt >= windowStart);
    const composeCharts = recentCharts.filter((row) => row.route === 'compose').length;
    const publishCharts = recentCharts.filter((row) => row.route === 'publish').length;

    const orders = await ctx.db.query('orders').collect();
    const purchases = orders.filter((row) => row.createdAt >= windowStart).length;

    const events = await ctx.db.query('eventDaily').collect();
    const tapMap = new Map<string, number>();
    for (const row of events) {
      if (row.day < windowDay) {
        continue;
      }
      tapMap.set(row.name, (tapMap.get(row.name) ?? 0) + row.count);
    }
    const taps = [...tapMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const aiRows = await ctx.db.query('aiCalls').collect();
    const aiInWindow = aiRows.filter((row) => row.createdAt >= windowStart);
    let aiInputTokens = 0;
    let aiOutputTokens = 0;
    for (const row of aiInWindow) {
      aiInputTokens += row.inputTokens;
      aiOutputTokens += row.outputTokens;
    }
    const aiEstimateUsd = estimateAiUsd(aiInputTokens, aiOutputTokens);

    return {
      people,
      chartsDrawn,
      composeCharts,
      publishCharts,
      purchases,
      taps,
      aiCalls: aiInWindow.length,
      aiInputTokens,
      aiOutputTokens,
      aiEstimateUsd,
    };
  },
});

function estimateAiUsd(inputTokens: number, outputTokens: number): number {
  const input = (inputTokens / 1_000_000) * 0.15;
  const output = (outputTokens / 1_000_000) * 0.6;
  return Math.round((input + output) * 100) / 100;
}
