import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  wallets: defineTable({
    token: v.string(),
    email: v.optional(v.string()),
    googleEmail: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    googleSub: v.optional(v.string()),
    credits: v.number(),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_email', ['email'])
    .index('by_customer', ['stripeCustomerId'])
    .index('by_google', ['googleSub']),

  dailyFree: defineTable({
    ipHash: v.string(),
    day: v.string(),
    count: v.number(),
  }).index('by_ip_day', ['ipHash', 'day']),

  orders: defineTable({
    stripeSessionId: v.string(),
    walletId: v.id('wallets'),
    credits: v.number(),
    createdAt: v.number(),
  })
    .index('by_session', ['stripeSessionId'])
    .index('by_wallet', ['walletId']),

  uses: defineTable({
    walletId: v.id('wallets'),
    via: v.union(v.literal('credit'), v.literal('free'), v.literal('owner')),
    createdAt: v.number(),
  }).index('by_wallet', ['walletId']),

  pastes: defineTable({
    slug: v.string(),
    token: v.string(),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),
});
