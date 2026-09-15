import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

export const FREE_PER_DAY = 3;
export const PACK_CREDITS = 25;

const quotaReturn = v.object({
  freeLeft: v.number(),
  credits: v.number(),
  canCompose: v.boolean(),
  unlimited: v.boolean(),
  saved: v.boolean(),
  email: v.optional(v.string()),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function newWalletToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function walletByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  return await ctx.db
    .query('wallets')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique();
}

async function walletByToken(ctx: QueryCtx | MutationCtx, token: string) {
  return await ctx.db
    .query('wallets')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique();
}

async function resolvePaidWallet(
  ctx: MutationCtx,
  args: { walletToken: string; email?: string; stripeCustomerId?: string }
): Promise<Doc<'wallets'>> {
  const email = args.email ? normalizeEmail(args.email) : undefined;
  const byToken = await walletByToken(ctx, args.walletToken);
  const byMail = email ? await walletByEmail(ctx, email) : null;

  // First checkout email wins. Apple Pay on a later buy must not split or reassign the pack.
  if (byToken?.email) {
    await ctx.db.patch(byToken._id, {
      stripeCustomerId: args.stripeCustomerId ?? byToken.stripeCustomerId,
    });
    const locked = await ctx.db.get(byToken._id);
    if (!locked) {
      throw new Error('Wallet missing');
    }
    return locked;
  }

  if (byMail && byToken && byMail._id !== byToken._id) {
    await ctx.db.patch(byMail._id, {
      credits: byMail.credits + byToken.credits,
      stripeCustomerId: args.stripeCustomerId ?? byMail.stripeCustomerId ?? byToken.stripeCustomerId,
      email,
      googleSub: byMail.googleSub ?? byToken.googleSub,
      googleEmail: byMail.googleEmail ?? byToken.googleEmail,
    });
    await ctx.db.replace(byToken._id, {
      token: byToken.token,
      stripeCustomerId: byToken.stripeCustomerId,
      googleSub: byToken.googleSub,
      googleEmail: byToken.googleEmail,
      credits: 0,
      createdAt: byToken.createdAt,
    });
    const merged = await ctx.db.get(byMail._id);
    if (!merged) {
      throw new Error('Wallet missing');
    }
    return merged;
  }

  if (byMail) {
    await ctx.db.patch(byMail._id, {
      stripeCustomerId: args.stripeCustomerId ?? byMail.stripeCustomerId,
    });
    const next = await ctx.db.get(byMail._id);
    if (!next) {
      throw new Error('Wallet missing');
    }
    return next;
  }

  if (byToken) {
    await ctx.db.patch(byToken._id, {
      ...(email ? { email } : {}),
      stripeCustomerId: args.stripeCustomerId ?? byToken.stripeCustomerId,
    });
    const next = await ctx.db.get(byToken._id);
    if (!next) {
      throw new Error('Wallet missing');
    }
    return next;
  }

  const walletId = await ctx.db.insert('wallets', {
    token: args.walletToken,
    email,
    stripeCustomerId: args.stripeCustomerId,
    credits: 0,
    createdAt: Date.now(),
  });
  const created = await ctx.db.get(walletId);
  if (!created) {
    throw new Error('Wallet missing');
  }
  return created;
}

function assertServer(secret: string): void {
  const expected = process.env.COMPOSE_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isOwnerEmail(email: string | undefined): boolean {
  return Boolean(email && ownerEmails().includes(email));
}

function isOwnerWallet(wallet: { email?: string; googleEmail?: string } | null | undefined): boolean {
  return Boolean(wallet && (isOwnerEmail(wallet.email) || isOwnerEmail(wallet.googleEmail)));
}

function signedInEmail(wallet: { googleEmail?: string } | null | undefined): string | undefined {
  return wallet?.googleEmail;
}

export const peek = query({
  args: {
    secret: v.string(),
    ipHash: v.string(),
    day: v.string(),
    walletToken: v.optional(v.string()),
  },
  returns: quotaReturn,
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = args.walletToken
      ? await ctx.db
          .query('wallets')
          .withIndex('by_token', (q) => q.eq('token', args.walletToken as string))
          .unique()
      : null;
    const daily = await ctx.db
      .query('dailyFree')
      .withIndex('by_ip_day', (q) => q.eq('ipHash', args.ipHash).eq('day', args.day))
      .unique();
    const credits = wallet?.credits ?? 0;
    const freeLeft = Math.max(0, FREE_PER_DAY - (daily?.count ?? 0));
    const unlimited = isOwnerWallet(wallet);
    return {
      freeLeft,
      credits,
      canCompose: unlimited || credits > 0 || freeLeft > 0,
      unlimited,
      saved: Boolean(wallet?.googleSub),
      email: signedInEmail(wallet),
    };
  },
});

export const consume = mutation({
  args: {
    secret: v.string(),
    ipHash: v.string(),
    day: v.string(),
    walletToken: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    via: v.union(v.literal('credit'), v.literal('free'), v.literal('pay'), v.literal('owner')),
    freeLeft: v.number(),
    credits: v.number(),
  }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = args.walletToken
      ? await ctx.db
          .query('wallets')
          .withIndex('by_token', (q) => q.eq('token', args.walletToken as string))
          .unique()
      : null;

    if (isOwnerWallet(wallet)) {
      if (wallet) {
        await logUse(ctx, wallet._id, 'owner');
      }
      return {
        ok: true,
        via: 'owner' as const,
        freeLeft: FREE_PER_DAY,
        credits: wallet?.credits ?? 0,
      };
    }

    if (wallet && wallet.credits > 0) {
      await ctx.db.patch(wallet._id, { credits: wallet.credits - 1 });
      await logUse(ctx, wallet._id, 'credit');
      const daily = await ctx.db
        .query('dailyFree')
        .withIndex('by_ip_day', (q) => q.eq('ipHash', args.ipHash).eq('day', args.day))
        .unique();
      return {
        ok: true,
        via: 'credit' as const,
        freeLeft: Math.max(0, FREE_PER_DAY - (daily?.count ?? 0)),
        credits: wallet.credits - 1,
      };
    }

    const daily = await ctx.db
      .query('dailyFree')
      .withIndex('by_ip_day', (q) => q.eq('ipHash', args.ipHash).eq('day', args.day))
      .unique();
    const used = daily?.count ?? 0;
    if (used >= FREE_PER_DAY) {
      return {
        ok: false,
        via: 'pay' as const,
        freeLeft: 0,
        credits: wallet?.credits ?? 0,
      };
    }

    if (daily) {
      await ctx.db.patch(daily._id, { count: used + 1 });
    } else {
      await ctx.db.insert('dailyFree', {
        ipHash: args.ipHash,
        day: args.day,
        count: 1,
      });
    }
    if (wallet) {
      await logUse(ctx, wallet._id, 'free');
    }

    return {
      ok: true,
      via: 'free' as const,
      freeLeft: FREE_PER_DAY - used - 1,
      credits: wallet?.credits ?? 0,
    };
  },
});

export const refund = mutation({
  args: {
    secret: v.string(),
    ipHash: v.string(),
    day: v.string(),
    via: v.union(v.literal('credit'), v.literal('free')),
    walletToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    if (args.via === 'credit' && args.walletToken) {
      const wallet = await ctx.db
        .query('wallets')
        .withIndex('by_token', (q) => q.eq('token', args.walletToken as string))
        .unique();
      if (wallet) {
        await ctx.db.patch(wallet._id, { credits: wallet.credits + 1 });
      }
      return null;
    }

    const daily = await ctx.db
      .query('dailyFree')
      .withIndex('by_ip_day', (q) => q.eq('ipHash', args.ipHash).eq('day', args.day))
      .unique();
    if (daily && daily.count > 0) {
      await ctx.db.patch(daily._id, { count: daily.count - 1 });
    }
    return null;
  },
});

export const ensureWallet = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const existing = await ctx.db
      .query('wallets')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (existing) {
      return null;
    }
    await ctx.db.insert('wallets', {
      token: args.token,
      credits: 0,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const creditFromStripe = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    stripeSessionId: v.string(),
    credits: v.number(),
    stripeCustomerId: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    duplicate: v.boolean(),
    credits: v.number(),
    walletToken: v.string(),
  }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const seen = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeSessionId', args.stripeSessionId))
      .unique();
    if (seen) {
      const wallet = await ctx.db.get(seen.walletId);
      if (!wallet) {
        return { ok: true, duplicate: true, credits: 0, walletToken: args.walletToken };
      }
      if (args.email) {
        const resolved = await resolvePaidWallet(ctx, {
          walletToken: wallet.token,
          email: args.email,
          stripeCustomerId: args.stripeCustomerId,
        });
        return {
          ok: true,
          duplicate: true,
          credits: resolved.credits,
          walletToken: resolved.token,
        };
      }
      return { ok: true, duplicate: true, credits: wallet.credits, walletToken: wallet.token };
    }

    const wallet = await resolvePaidWallet(ctx, {
      walletToken: args.walletToken,
      email: args.email,
      stripeCustomerId: args.stripeCustomerId,
    });
    const nextCredits = wallet.credits + args.credits;
    await ctx.db.patch(wallet._id, {
      credits: nextCredits,
      stripeCustomerId: args.stripeCustomerId ?? wallet.stripeCustomerId,
    });
    await ctx.db.insert('orders', {
      stripeSessionId: args.stripeSessionId,
      walletId: wallet._id,
      credits: args.credits,
      createdAt: Date.now(),
    });
    return { ok: true, duplicate: false, credits: nextCredits, walletToken: wallet.token };
  },
});

export const listOrders = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
  },
  returns: v.array(
    v.object({
      createdAt: v.number(),
      credits: v.number(),
    })
  ),
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
      .query('orders')
      .withIndex('by_wallet', (q) => q.eq('walletId', wallet._id))
      .order('desc')
      .take(50);
    return rows.map((row) => ({ createdAt: row.createdAt, credits: row.credits }));
  },
});

export const getWallet = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      token: v.string(),
      credits: v.number(),
      email: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      orders: v.array(
        v.object({
          createdAt: v.number(),
          credits: v.number(),
          stripeSessionId: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await walletByToken(ctx, args.walletToken);
    if (!wallet) {
      return null;
    }
    const rows = await ctx.db
      .query('orders')
      .withIndex('by_wallet', (q) => q.eq('walletId', wallet._id))
      .order('desc')
      .take(50);
    return {
      token: wallet.token,
      credits: wallet.credits,
      email: wallet.email,
      stripeCustomerId: wallet.stripeCustomerId,
      orders: rows.map((row) => ({
        createdAt: row.createdAt,
        credits: row.credits,
        stripeSessionId: row.stripeSessionId,
      })),
    };
  },
});

export const walletTokenForEmail = query({
  args: {
    secret: v.string(),
    email: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await walletByEmail(ctx, normalizeEmail(args.email));
    return wallet?.token ?? null;
  },
});

export const attachEmail = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    email: v.string(),
  },
  returns: v.object({
    walletToken: v.string(),
    credits: v.number(),
  }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await resolvePaidWallet(ctx, {
      walletToken: args.walletToken,
      email: args.email,
    });
    return { walletToken: wallet.token, credits: wallet.credits };
  },
});

const googleBindReturn = v.union(
  v.null(),
  v.object({
    walletToken: v.string(),
    credits: v.number(),
    unlimited: v.boolean(),
  }),
);

async function walletByGoogle(ctx: QueryCtx | MutationCtx, googleSub: string) {
  return await ctx.db
    .query('wallets')
    .withIndex('by_google', (q) => q.eq('googleSub', googleSub))
    .unique();
}

function packFromWallet(wallet: Doc<'wallets'>) {
  return {
    walletToken: wallet.token,
    credits: wallet.credits,
    unlimited: isOwnerWallet(wallet),
  };
}

async function logUse(
  ctx: MutationCtx,
  walletId: Doc<'wallets'>['_id'],
  via: 'credit' | 'free' | 'owner'
): Promise<void> {
  await ctx.db.insert('uses', {
    walletId,
    via,
    createdAt: Date.now(),
  });
}

function utcDayFrom(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const bindGoogle = mutation({
  args: {
    secret: v.string(),
    walletToken: v.optional(v.string()),
    googleSub: v.string(),
    googleEmail: v.string(),
  },
  returns: googleBindReturn,
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const googleEmail = normalizeEmail(args.googleEmail);
    const byGoogle = await walletByGoogle(ctx, args.googleSub);
    if (byGoogle) {
      await ctx.db.patch(byGoogle._id, { googleEmail });
      const next = await ctx.db.get(byGoogle._id);
      if (!next) {
        throw new Error('Wallet missing');
      }
      return packFromWallet(next);
    }

    const byToken = args.walletToken ? await walletByToken(ctx, args.walletToken) : null;
    if (byToken) {
      await ctx.db.patch(byToken._id, {
        googleSub: byToken.googleSub ?? args.googleSub,
        googleEmail,
      });
      const next = await ctx.db.get(byToken._id);
      if (!next) {
        throw new Error('Wallet missing');
      }
      return packFromWallet(next);
    }

    const byMail = await walletByEmail(ctx, googleEmail);
    if (byMail) {
      await ctx.db.patch(byMail._id, {
        googleSub: byMail.googleSub ?? args.googleSub,
        googleEmail,
      });
      const next = await ctx.db.get(byMail._id);
      if (!next) {
        throw new Error('Wallet missing');
      }
      return packFromWallet(next);
    }

    const walletId = await ctx.db.insert('wallets', {
      token: newWalletToken(),
      googleSub: args.googleSub,
      googleEmail,
      credits: 0,
      createdAt: Date.now(),
    });
    const created = await ctx.db.get(walletId);
    if (!created) {
      throw new Error('Wallet missing');
    }
    return packFromWallet(created);
  },
});

export const getAccount = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({
      email: v.optional(v.string()),
      credits: v.number(),
      unlimited: v.boolean(),
      saved: v.boolean(),
      used: v.number(),
      days: v.array(
        v.object({
          day: v.string(),
          charts: v.number(),
        })
      ),
      orders: v.array(
        v.object({
          createdAt: v.number(),
          credits: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await walletByToken(ctx, args.walletToken);
    if (!wallet) {
      return null;
    }
    const windowStart = args.now - 14 * 24 * 60 * 60 * 1000;
    const uses = await ctx.db
      .query('uses')
      .withIndex('by_wallet', (q) => q.eq('walletId', wallet._id))
      .order('desc')
      .take(400);
    const inWindow = uses.filter((row) => row.createdAt >= windowStart);
    const byDay = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const day = utcDayFrom(args.now - i * 24 * 60 * 60 * 1000);
      byDay.set(day, 0);
    }
    for (const row of inWindow) {
      const day = utcDayFrom(row.createdAt);
      if (byDay.has(day)) {
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
    }
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_wallet', (q) => q.eq('walletId', wallet._id))
      .order('desc')
      .take(50);
    return {
      email: signedInEmail(wallet),
      credits: wallet.credits,
      unlimited: isOwnerWallet(wallet),
      saved: Boolean(wallet.googleSub),
      used: inWindow.length,
      days: [...byDay.entries()].map(([day, charts]) => ({ day, charts })),
      orders: orders.map((row) => ({ createdAt: row.createdAt, credits: row.credits })),
    };
  },
});
