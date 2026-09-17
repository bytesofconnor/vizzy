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

  charts: defineTable({
    walletId: v.id('wallets'),
    slug: v.string(),
    title: v.string(),
    route: v.union(v.literal('compose'), v.literal('publish')),
    createdAt: v.number(),
    pinnedAt: v.optional(v.number()),
  })
    .index('by_wallet', ['walletId', 'createdAt'])
    .index('by_wallet_slug', ['walletId', 'slug'])
    .index('by_wallet_pinned', ['walletId', 'pinnedAt']),

  eventDaily: defineTable({
    name: v.string(),
    day: v.string(),
    count: v.number(),
  }).index('by_name_day', ['name', 'day']),

  aiCalls: defineTable({
    route: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    createdAt: v.number(),
  }).index('by_created', ['createdAt']),

  connections: defineTable({
    walletId: v.id('wallets'),
    connectorId: v.string(),
    status: v.union(v.literal('active'), v.literal('revoked'), v.literal('error')),
    secrets: v.string(),
    label: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_wallet', ['walletId'])
    .index('by_wallet_connector', ['walletId', 'connectorId']),

  evalRuns: defineTable({
    runId: v.string(),
    kind: v.string(),
    models: v.array(v.string()),
    repeats: v.number(),
    n: v.number(),
    passed: v.number(),
    rate: v.number(),
    byStyle: v.array(
      v.object({ key: v.string(), n: v.number(), passed: v.number(), rate: v.number() })
    ),
    bySituation: v.array(
      v.object({ key: v.string(), n: v.number(), passed: v.number(), rate: v.number() })
    ),
    byModel: v.array(
      v.object({ key: v.string(), n: v.number(), passed: v.number(), rate: v.number() })
    ),
    byDomain: v.array(
      v.object({ key: v.string(), n: v.number(), passed: v.number(), rate: v.number() })
    ),
    byIssue: v.array(v.object({ code: v.string(), n: v.number() })),
    brittle: v.array(v.object({ promptId: v.string(), model: v.string() })),
    recs: v.array(
      v.object({
        id: v.string(),
        kind: v.string(),
        claim: v.string(),
        evidence: v.string(),
        examplePromptIds: v.array(v.string()),
        suggestedChange: v.string(),
      })
    ),
    fails: v.array(
      v.object({
        promptId: v.string(),
        model: v.string(),
        seed: v.number(),
        issues: v.array(v.string()),
        prompt: v.string(),
      })
    ),
    createdAt: v.number(),
    clearedRecIds: v.optional(v.array(v.string())),
  }).index('by_created', ['createdAt']),

  evalRecStates: defineTable({
    recId: v.string(),
    status: v.union(v.literal('working'), v.literal('wont')),
    updatedAt: v.number(),
  }).index('by_rec', ['recId']),

  seriesCache: defineTable({
    family: v.string(),
    seriesId: v.string(),
    sourceLabel: v.string(),
    sourceUrl: v.string(),
    method: v.literal('official'),
    retrieved: v.number(),
    xLabel: v.string(),
    yLabel: v.string(),
    rows: v.array(v.object({ x: v.string(), y: v.number() })),
  }).index('by_series', ['family', 'seriesId']),

  resolveEvents: defineTable({
    family: v.optional(v.string()),
    seriesId: v.optional(v.string()),
    outcome: v.union(v.literal('hit'), v.literal('miss'), v.literal('error')),
    fromCache: v.boolean(),
    createdAt: v.number(),
  }).index('by_created', ['createdAt']),
});
