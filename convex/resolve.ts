import { mutation, query, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

const seriesRow = v.object({ x: v.string(), y: v.number() });

const cachedSeries = v.object({
  family: v.string(),
  seriesId: v.string(),
  sourceLabel: v.string(),
  sourceUrl: v.string(),
  method: v.literal('official'),
  retrieved: v.number(),
  xLabel: v.string(),
  yLabel: v.string(),
  rows: v.array(seriesRow),
});

export const getCached = query({
  args: {
    secret: v.string(),
    family: v.string(),
    seriesId: v.string(),
    now: v.number(),
    maxAgeMs: v.number(),
  },
  returns: v.union(cachedSeries, v.null()),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const row = await ctx.db
      .query('seriesCache')
      .withIndex('by_series', (q) => q.eq('family', args.family).eq('seriesId', args.seriesId))
      .unique();
    if (!row) {
      return null;
    }
    if (args.now - row.retrieved > args.maxAgeMs) {
      return null;
    }
    return {
      family: row.family,
      seriesId: row.seriesId,
      sourceLabel: row.sourceLabel,
      sourceUrl: row.sourceUrl,
      method: row.method,
      retrieved: row.retrieved,
      xLabel: row.xLabel,
      yLabel: row.yLabel,
      rows: row.rows,
    };
  },
});

export const putCached = mutation({
  args: {
    secret: v.string(),
    family: v.string(),
    seriesId: v.string(),
    sourceLabel: v.string(),
    sourceUrl: v.string(),
    retrieved: v.number(),
    xLabel: v.string(),
    yLabel: v.string(),
    rows: v.array(seriesRow),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const existing = await ctx.db
      .query('seriesCache')
      .withIndex('by_series', (q) => q.eq('family', args.family).eq('seriesId', args.seriesId))
      .unique();
    const body = {
      family: args.family,
      seriesId: args.seriesId,
      sourceLabel: args.sourceLabel,
      sourceUrl: args.sourceUrl,
      method: 'official' as const,
      retrieved: args.retrieved,
      xLabel: args.xLabel,
      yLabel: args.yLabel,
      rows: args.rows,
    };
    if (existing) {
      await ctx.db.patch(existing._id, body);
    } else {
      await ctx.db.insert('seriesCache', body);
    }
    return null;
  },
});

export const recordEvent = mutation({
  args: {
    secret: v.string(),
    family: v.optional(v.string()),
    seriesId: v.optional(v.string()),
    outcome: v.union(v.literal('hit'), v.literal('miss'), v.literal('error')),
    fromCache: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, args) => {
    assertServer(args.secret);
    await ctx.db.insert('resolveEvents', {
      family: args.family,
      seriesId: args.seriesId,
      outcome: args.outcome,
      fromCache: args.fromCache,
      createdAt: Date.now(),
    });
    return null;
  },
});
