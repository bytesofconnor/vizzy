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
  returns: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      route: v.union(v.literal('compose'), v.literal('publish')),
      createdAt: v.number(),
    })
  ),
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
    }));
  },
});
