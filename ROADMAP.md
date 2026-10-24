# Vizzy Roadmap
Updated: 2026-10-23 · Owner: Vizzy · North star: pasteable, opinionated charts for writers (link + PNG), chart excellence before My BI.

## Open (ranked; knock off from the top)
1. **Sharper outcome headline** — Lead with what the writer gets: a publish-ready chart as a link or PNG. Check: headline names the outcome, not a vague BI pitch.
2. **Personal chart library** — Every chart you make is saved and easy to find again (retention). Check: signed-in user can list prior charts and reopen one.
3. **Edit charts in place** — Tweak a published chart without remaking it; embeds update. Check: edit flow changes the same URL/PNG without minting a new id unless intended.
4. **Agent-ready create-chart API** — Prompt or data in → link + PNG + source out. Check: documented public compose/publish path works for an agent with no browser.
5. **MCP connector** — Agents in Muse/Claude/ChatGPT can make Vizzy charts. Check: MCP tools listed and one end-to-end create works.
6. **Source picking with Jev** — Choose the best official source automatically; show receipts. Check: chart carries source label/url when Jev picks.
7. **My BI live pins** — Charts that stay updated, pinned to a personal dashboard. Check: pinned chart refreshes without manual republish.

## Shipped
- **Clear generate button on the homepage** — 2026-10-23. Live CTA is "Generate my chart". Already on vizzy.run. [35511fa](https://github.com/bytesofconnor/vizzy/commit/35511fabd79e0a310a5195cecdff2e25698c99d0).
- **Pricing line on the homepage** — 2026-10-23. Live note is "3 free today, then $8 for 25". Pack infra is `FREE_PER_DAY=3`, `PACK_CREDITS=25`, `PACK_CENTS=800`, Stripe and Convex. Already on vizzy.run. Copy in [35511fa](https://github.com/bytesofconnor/vizzy/commit/35511fabd79e0a310a5195cecdff2e25698c99d0). Constants in [6e004ec](https://github.com/bytesofconnor/vizzy/commit/6e004ecfa03f5c21676151a55477ae3e8efe7add).

## Not doing
- Product Hunt launch — premature until the homepage converts and the chart loop is proven.
- Broad "ChatGPT for BI" positioning — Vizzy is chart excellence first; My BI is later.
