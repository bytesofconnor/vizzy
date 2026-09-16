import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const TAKEN = new Set(['reef', 'chips', 'ozone', 'tigers', 'vinyl', 'july', 'price', 'corners', 'tips', 'keep', 'x']);

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

export const put = mutation({
  args: {
    secret: v.string(),
    slug: v.string(),
    token: v.string(),
  },
  returns: v.union(v.literal('ok'), v.literal('taken')),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    if (TAKEN.has(args.slug) || args.slug.length < 6 || args.slug.length > 24) {
      return 'taken';
    }
    const existing = await ctx.db
      .query('pastes')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (existing) {
      return 'taken';
    }
    await ctx.db.insert('pastes', {
      slug: args.slug,
      token: args.token,
      createdAt: Date.now(),
    });
    return 'ok';
  },
});

export const get = query({
  args: {
    secret: v.string(),
    slug: v.string(),
  },
  returns: v.union(v.null(), v.object({ token: v.string() })),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const row = await ctx.db
      .query('pastes')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    return row ? { token: row.token } : null;
  },
});
