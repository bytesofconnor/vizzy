import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

const connectionReturn = v.object({
  connectorId: v.string(),
  status: v.union(v.literal('active'), v.literal('revoked'), v.literal('error')),
  label: v.optional(v.string()),
  updatedAt: v.number(),
});

export const listForWallet = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
  },
  returns: v.array(connectionReturn),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await ctx.db
      .query('wallets')
      .withIndex('by_token', (q) => q.eq('token', args.walletToken))
      .unique();
    if (!wallet) {
      return [];
    }
    const rows = await ctx.db
      .query('connections')
      .withIndex('by_wallet', (q) => q.eq('walletId', wallet._id))
      .collect();
    return rows
      .filter((row) => row.status === 'active')
      .map((row) => ({
        connectorId: row.connectorId,
        status: row.status,
        label: row.label,
        updatedAt: row.updatedAt,
      }));
  },
});

export const upsert = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    connectorId: v.string(),
    secrets: v.string(),
    label: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await ctx.db
      .query('wallets')
      .withIndex('by_token', (q) => q.eq('token', args.walletToken))
      .unique();
    if (!wallet) {
      return { ok: false };
    }
    const now = Date.now();
    const existing = await ctx.db
      .query('connections')
      .withIndex('by_wallet_connector', (q) =>
        q.eq('walletId', wallet._id).eq('connectorId', args.connectorId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        secrets: args.secrets,
        label: args.label ?? existing.label,
        status: 'active',
        updatedAt: now,
      });
      return { ok: true };
    }
    await ctx.db.insert('connections', {
      walletId: wallet._id,
      connectorId: args.connectorId,
      secrets: args.secrets,
      label: args.label,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const disconnect = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    connectorId: v.string(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await ctx.db
      .query('wallets')
      .withIndex('by_token', (q) => q.eq('token', args.walletToken))
      .unique();
    if (!wallet) {
      return { ok: false };
    }
    const existing = await ctx.db
      .query('connections')
      .withIndex('by_wallet_connector', (q) =>
        q.eq('walletId', wallet._id).eq('connectorId', args.connectorId)
      )
      .unique();
    if (!existing) {
      return { ok: true };
    }
    await ctx.db.patch(existing._id, { status: 'revoked', updatedAt: Date.now() });
    return { ok: true };
  },
});
