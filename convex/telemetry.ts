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
const aiCallRow = v.object({
  route: v.string(),
  model: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  createdAt: v.number(),
});
const savedChartRow = v.object({
  title: v.string(),
  route: v.union(v.literal('compose'), v.literal('publish')),
  createdAt: v.number(),
});

export const getInsights = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    now: v.number(),
  },
  returns: v.union(v.null(), v.object({
    people: v.number(),
    meterDraws: v.number(),
    savedFromPrompt: v.number(),
    savedFromPublish: v.number(),
    purchases: v.number(),
    taps: v.array(insightRow),
    aiCalls: v.number(),
    aiInputTokens: v.number(),
    aiOutputTokens: v.number(),
    aiByModel: v.array(
      v.object({
        model: v.string(),
        calls: v.number(),
        inputTokens: v.number(),
        outputTokens: v.number(),
      })
    ),
    recentAi: v.array(aiCallRow),
    recentSaved: v.array(savedChartRow),
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
    const meterDraws = uses.filter((row) => row.createdAt >= windowStart).length;

    const charts = await ctx.db.query('charts').collect();
    const recentCharts = charts.filter((row) => row.createdAt >= windowStart);
    const savedFromPrompt = recentCharts.filter((row) => row.route === 'compose').length;
    const savedFromPublish = recentCharts.filter((row) => row.route === 'publish').length;

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
    const byModel = new Map<
      string,
      { model: string; calls: number; inputTokens: number; outputTokens: number }
    >();
    for (const row of aiInWindow) {
      aiInputTokens += row.inputTokens;
      aiOutputTokens += row.outputTokens;
      const existing = byModel.get(row.model);
      if (existing) {
        existing.calls += 1;
        existing.inputTokens += row.inputTokens;
        existing.outputTokens += row.outputTokens;
      } else {
        byModel.set(row.model, {
          model: row.model,
          calls: 1,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
        });
      }
    }
    const aiByModel = [...byModel.values()].sort((a, b) => b.inputTokens - a.inputTokens);
    const recentAi = [...aiInWindow]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15)
      .map((row) => ({
        route: row.route,
        model: row.model,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        createdAt: row.createdAt,
      }));
    const recentSaved = [...recentCharts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15)
      .map((row) => ({
        title: row.title,
        route: row.route,
        createdAt: row.createdAt,
      }));

    return {
      people,
      meterDraws,
      savedFromPrompt,
      savedFromPublish,
      purchases,
      taps,
      aiCalls: aiInWindow.length,
      aiInputTokens,
      aiOutputTokens,
      aiByModel,
      recentAi,
      recentSaved,
    };
  },
});
