import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

async function walletIdByToken(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Id<'wallets'> | null> {
  const wallet = await ctx.db
    .query('wallets')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique();
  return wallet?._id ?? null;
}

const PIN_CAP = 24;

const chartRow = v.object({
  slug: v.string(),
  title: v.string(),
  route: v.union(v.literal('compose'), v.literal('publish')),
  createdAt: v.number(),
  pinned: v.boolean(),
});

export const save = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    slug: v.string(),
    title: v.string(),
    route: v.union(v.literal('compose'), v.literal('publish')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const walletId = await walletIdByToken(ctx, args.walletToken);
    if (!walletId) {
      return null;
    }
    const title = args.title.trim().slice(0, 160) || 'Chart';
    const slug = args.slug.trim();
    if (!slug || slug.length > 64) {
      return null;
    }
    await ctx.db.insert('charts', {
      walletId,
      slug,
      title,
      route: args.route,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const listRecent = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(chartRow),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const walletId = await walletIdByToken(ctx, args.walletToken);
    if (!walletId) {
      return [];
    }
    const cap = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const rows = await ctx.db
      .query('charts')
      .withIndex('by_wallet', (q) => q.eq('walletId', walletId))
      .order('desc')
      .take(cap);
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      route: row.route,
      createdAt: row.createdAt,
      pinned: Boolean(row.pinnedAt),
    }));
  },
});

export const isPinned = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    slug: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const walletId = await walletIdByToken(ctx, args.walletToken);
    if (!walletId) {
      return false;
    }
    const row = await latestChart(ctx, walletId, args.slug);
    return Boolean(row?.pinnedAt);
  },
});

export const listPinned = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(chartRow),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const walletId = await walletIdByToken(ctx, args.walletToken);
    if (!walletId) {
      return [];
    }
    const cap = Math.min(Math.max(args.limit ?? 12, 1), PIN_CAP);
    const rows = await ctx.db
      .query('charts')
      .withIndex('by_wallet_pinned', (q) => q.eq('walletId', walletId))
      .order('desc')
      .take(cap);
    return rows
      .filter((row) => Boolean(row.pinnedAt))
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        route: row.route,
        createdAt: row.createdAt,
        pinned: true,
      }));
  },
});

export const setPinned = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    slug: v.string(),
    title: v.optional(v.string()),
    route: v.optional(v.union(v.literal('compose'), v.literal('publish'))),
    pinned: v.boolean(),
  },
  returns: v.object({
    pinned: v.boolean(),
  }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const walletId = await walletIdByToken(ctx, args.walletToken);
    if (!walletId) {
      return { pinned: false };
    }
    const slug = args.slug.trim();
    if (!slug || slug.length > 64) {
      return { pinned: false };
    }
    const title = (args.title ?? '').trim().slice(0, 160) || 'Chart';
    let row = await latestChart(ctx, walletId, slug);
    if (!row && args.pinned) {
      await ctx.db.insert('charts', {
        walletId,
        slug,
        title,
        route: args.route ?? 'compose',
        createdAt: Date.now(),
        pinnedAt: Date.now(),
      });
      row = await latestChart(ctx, walletId, slug);
    }
    if (!row) {
      return { pinned: false };
    }
    if (args.pinned) {
      const already = await ctx.db
        .query('charts')
        .withIndex('by_wallet_pinned', (q) => q.eq('walletId', walletId))
        .order('desc')
        .take(PIN_CAP);
      const pinnedCount = already.filter((item) => Boolean(item.pinnedAt) && item._id !== row._id).length;
      if (pinnedCount >= PIN_CAP) {
        throw new Error(`You can pin ${PIN_CAP} charts. Unpin one first.`);
      }
      await ctx.db.patch(row._id, {
        title: title || row.title,
        pinnedAt: Date.now(),
      });
      return { pinned: true };
    }
    await ctx.db.patch(row._id, { pinnedAt: undefined });
    return { pinned: false };
  },
});

async function latestChart(
  ctx: QueryCtx | MutationCtx,
  walletId: Id<'wallets'>,
  slug: string
) {
  const rows = await ctx.db
    .query('charts')
    .withIndex('by_wallet_slug', (q) => q.eq('walletId', walletId).eq('slug', slug))
    .take(8);
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}
