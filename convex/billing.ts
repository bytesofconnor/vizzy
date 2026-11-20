import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { freeChartsLeft } from './freeCharts';

export const FREE_PER_DAY = 3;
export const PACK_CREDITS = 25;

const quotaReturn = v.object({
  freeLeft: v.number(),
  credits: v.number(),
  canCompose: v.boolean(),
  unlimited: v.boolean(),
  writer: v.boolean(),
  saved: v.boolean(),
  email: v.optional(v.string()),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function mergeWallets(
  ctx: MutationCtx,
  keepId: Doc<'wallets'>['_id'],
  dropId: Doc<'wallets'>['_id']
): Promise<Doc<'wallets'>> {
  if (keepId === dropId) {
    const wallet = await ctx.db.get('wallets', keepId);
    if (!wallet) {
      throw new Error('Wallet missing');
    }
    return wallet;
  }
  const keep = await ctx.db.get('wallets', keepId);
  const drop = await ctx.db.get('wallets', dropId);
  if (!keep || !drop) {
    throw new Error('Wallet missing');
  }

  await ctx.db.patch(keepId, {
    credits: keep.credits + drop.credits,
    stripeCustomerId: keep.stripeCustomerId ?? drop.stripeCustomerId,
    email: keep.email ?? drop.email,
    googleSub: keep.googleSub ?? drop.googleSub,
    googleEmail: keep.googleEmail ?? drop.googleEmail,
    ...(keep.plan === 'writer' || drop.plan === 'writer' ? { plan: 'writer' as const } : {}),
    ...(keep.writerCheckoutSessionId || drop.writerCheckoutSessionId
      ? { writerCheckoutSessionId: keep.writerCheckoutSessionId ?? drop.writerCheckoutSessionId }
      : {}),
  });

  for (const row of await ctx.db
    .query('orders')
    .withIndex('by_wallet', (q) => q.eq('walletId', dropId))
    .collect()) {
    await ctx.db.patch(row._id, { walletId: keepId });
  }
  for (const row of await ctx.db
    .query('uses')
    .withIndex('by_wallet', (q) => q.eq('walletId', dropId))
    .collect()) {
    await ctx.db.patch(row._id, { walletId: keepId });
  }
  for (const row of await ctx.db
    .query('charts')
    .withIndex('by_wallet', (q) => q.eq('walletId', dropId))
    .collect()) {
    await ctx.db.patch(row._id, { walletId: keepId });
  }

  await ctx.db.replace(dropId, {
    token: drop.token,
    credits: 0,
    createdAt: drop.createdAt,
  });

  const merged = await ctx.db.get('wallets', keepId);
  if (!merged) {
    throw new Error('Wallet missing');
  }
  return merged;
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
    return await mergeWallets(ctx, byMail._id, byToken._id);
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

async function dailyRow(ctx: QueryCtx | MutationCtx, hash: string, day: string) {
  return await ctx.db
    .query('dailyFree')
    .withIndex('by_ip_day', (q) => q.eq('ipHash', hash).eq('day', day))
    .unique();
}

async function bumpDaily(
  ctx: MutationCtx,
  hash: string,
  day: string,
  current: { _id: Id<'dailyFree'>; count: number } | null
) {
  if (current) {
    await ctx.db.patch(current._id, { count: current.count + 1 });
    return;
  }
  await ctx.db.insert('dailyFree', { ipHash: hash, day, count: 1 });
}

async function easeDaily(ctx: MutationCtx, hash: string, day: string) {
  const row = await dailyRow(ctx, hash, day);
  if (row && row.count > 0) {
    await ctx.db.patch(row._id, { count: row.count - 1 });
  }
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
    writerPlan: v.optional(v.boolean()),
    deviceHash: v.optional(v.string()),
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
    const daily = await dailyRow(ctx, args.ipHash, args.day);
    const device = args.deviceHash ? await dailyRow(ctx, args.deviceHash, args.day) : null;
    const credits = wallet?.credits ?? 0;
    const freeLeft = freeChartsLeft(daily?.count ?? 0, args.deviceHash ? (device?.count ?? 0) : 0, FREE_PER_DAY);
    const unlimited = isOwnerWallet(wallet);
    const writer = Boolean(args.writerPlan) && wallet?.plan === 'writer';
    return {
      freeLeft,
      credits,
      canCompose: unlimited || writer || credits > 0 || freeLeft > 0,
      unlimited,
      writer,
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
    writerPlan: v.optional(v.boolean()),
    deviceHash: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    via: v.union(
      v.literal('credit'),
      v.literal('free'),
      v.literal('pay'),
      v.literal('owner'),
      v.literal('writer')
    ),
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

    if (args.writerPlan && wallet?.plan === 'writer') {
      await logUse(ctx, wallet._id, 'writer');
      return {
        ok: true,
        via: 'writer' as const,
        freeLeft: FREE_PER_DAY,
        credits: wallet.credits,
      };
    }

    const ipRow = await dailyRow(ctx, args.ipHash, args.day);
    const deviceRow = args.deviceHash ? await dailyRow(ctx, args.deviceHash, args.day) : null;
    const ipCount = ipRow?.count ?? 0;
    const deviceCount = args.deviceHash ? (deviceRow?.count ?? 0) : 0;
    const freeLeft = freeChartsLeft(ipCount, deviceCount, FREE_PER_DAY);

    if (wallet && wallet.credits > 0) {
      await ctx.db.patch(wallet._id, { credits: wallet.credits - 1 });
      await logUse(ctx, wallet._id, 'credit');
      return {
        ok: true,
        via: 'credit' as const,
        freeLeft,
        credits: wallet.credits - 1,
      };
    }

    if (freeLeft <= 0) {
      return {
        ok: false,
        via: 'pay' as const,
        freeLeft: 0,
        credits: wallet?.credits ?? 0,
      };
    }

    await bumpDaily(ctx, args.ipHash, args.day, ipRow);
    if (args.deviceHash) {
      await bumpDaily(ctx, args.deviceHash, args.day, deviceRow);
    }
    if (wallet) {
      await logUse(ctx, wallet._id, 'free');
    }

    return {
      ok: true,
      via: 'free' as const,
      freeLeft: freeChartsLeft(ipCount + 1, args.deviceHash ? deviceCount + 1 : 0, FREE_PER_DAY),
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
    deviceHash: v.optional(v.string()),
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

    await easeDaily(ctx, args.ipHash, args.day);
    if (args.deviceHash) {
      await easeDaily(ctx, args.deviceHash, args.day);
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

export const grantWriter = mutation({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    stripeSessionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    duplicate: v.boolean(),
    plan: v.literal('writer'),
    walletToken: v.string(),
  }),
  handler: async (ctx, args) => {
    assertServer(args.secret);
    const wallet = await resolvePaidWallet(ctx, {
      walletToken: args.walletToken,
      email: args.email,
      stripeCustomerId: args.stripeCustomerId,
    });
    if (wallet.plan === 'writer') {
      if (!wallet.writerCheckoutSessionId) {
        await ctx.db.patch(wallet._id, { writerCheckoutSessionId: args.stripeSessionId });
      }
      return { ok: true, duplicate: true, plan: 'writer' as const, walletToken: wallet.token };
    }
    await ctx.db.patch(wallet._id, {
      plan: 'writer',
      writerCheckoutSessionId: args.stripeSessionId,
      stripeCustomerId: args.stripeCustomerId ?? wallet.stripeCustomerId,
    });
    return { ok: true, duplicate: false, plan: 'writer' as const, walletToken: wallet.token };
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
  via: 'credit' | 'free' | 'owner' | 'writer'
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

export const repairDuplicateWallets = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const wallets = await ctx.db.query('wallets').collect();
    const byEmail = new Map<string, Doc<'wallets'>[]>();
    for (const wallet of wallets) {
      const raw = wallet.googleEmail ?? wallet.email;
      if (!raw) {
        continue;
      }
      const email = normalizeEmail(raw);
      const group = byEmail.get(email) ?? [];
      group.push(wallet);
      byEmail.set(email, group);
    }

    let mergedCount = 0;
    for (const group of byEmail.values()) {
      if (group.length < 2) {
        continue;
      }
      const sorted = [...group].sort((a, b) => {
        if (a.email && !b.email) {
          return -1;
        }
        if (!a.email && b.email) {
          return 1;
        }
        return a.createdAt - b.createdAt;
      });
      const keep = sorted[0]!;
      for (let index = 1; index < sorted.length; index += 1) {
        await mergeWallets(ctx, keep._id, sorted[index]!._id);
        mergedCount += 1;
      }
    }
    return mergedCount;
  },
});

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
    const byMail = await walletByEmail(ctx, googleEmail);
    const byToken = args.walletToken ? await walletByToken(ctx, args.walletToken) : null;

    let canonical = byMail ?? byGoogle ?? byToken;
    if (!canonical) {
      const walletId = await ctx.db.insert('wallets', {
        token: newWalletToken(),
        googleSub: args.googleSub,
        googleEmail,
        email: googleEmail,
        credits: 0,
        createdAt: Date.now(),
      });
      const created = await ctx.db.get(walletId);
      if (!created) {
        throw new Error('Wallet missing');
      }
      return packFromWallet(created);
    }

    const mergeIds = new Set<Doc<'wallets'>['_id']>();
    for (const wallet of [byMail, byGoogle, byToken]) {
      if (!wallet || wallet._id === canonical._id || mergeIds.has(wallet._id)) {
        continue;
      }
      mergeIds.add(wallet._id);
      canonical = await mergeWallets(ctx, canonical._id, wallet._id);
    }

    await ctx.db.patch(canonical._id, {
      googleSub: args.googleSub,
      googleEmail,
      email: canonical.email ?? googleEmail,
    });
    const next = await ctx.db.get(canonical._id);
    if (!next) {
      throw new Error('Wallet missing');
    }
    return packFromWallet(next);
  },
});

export const getAccount = query({
  args: {
    secret: v.string(),
    walletToken: v.string(),
    now: v.number(),
    writerPlan: v.optional(v.boolean()),
  },
  returns: v.union(
    v.null(),
    v.object({
      email: v.optional(v.string()),
      credits: v.number(),
      unlimited: v.boolean(),
      writer: v.boolean(),
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
      writer: Boolean(args.writerPlan) && wallet.plan === 'writer',
      saved: Boolean(wallet.googleSub),
      used: inWindow.length,
      days: [...byDay.entries()].map(([day, charts]) => ({ day, charts })),
      orders: orders.map((row) => ({
        createdAt: row.createdAt,
        credits: row.credits,
        stripeSessionId: row.stripeSessionId,
      })),
    };
  },
});
