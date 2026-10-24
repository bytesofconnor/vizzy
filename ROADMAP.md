# Vizzy Roadmap
Updated: 2026-10-23 · Owner: Vizzy · North star: pasteable, opinionated charts for writers (link + PNG), chart excellence before My BI.

## Open (ranked; knock off from the top)
1. **Call only models the gateway still serves** — Hero ideas, public lookup, revision hints, and the compose fallback call `groq/llama-3.3-70b-versatile`. Production logged `GatewayModelNotFoundError` for that id 33 times on `/api/prompt-ideas` (22 users, last seen 2026-10-24) and once on `/api/revisions`. Check: `LOOKUP_MODEL`, `HINT_MODEL`, `REVISION_HINT_MODEL`, and `COMPOSE_MODELS` are ids the gateway catalog returns, and a 7-day runtime window has zero `GatewayModelNotFoundError`.
2. **Keep an official series when the fetch fails once** — `gatherOfficialSeries` records a catalog match as `error` and returns null when `resolvePrompt` throws or yields fewer than two rows. Compose then treats the prompt like a miss. Check: a NOAA, FRED, or OWID prompt still mints `source.method` official from the day cache or one retry, and a total failure names the series instead of "Could not find published numbers".
3. **A miss is not a made-up chart** — After official and Sonar miss, `gatherFacts` calls the dead lookup model, swallows the error, and returns empty notes. `mintDraft` can still publish an estimate when the evidence string is at least 20 characters. Check: a chart is not `official` or `scraped` unless that request fetched the URL, and a lookup exception is a different error from "no published numbers".
4. **Revise the open chart while the hint model is down** — `/api/revisions` logged the same missing model. Local revise already covers grayscale and some edits without a model, and hint failure falls back to heuristics only after the error. Check: sort, bar/line switch, and drop-a-point succeed when the hint model returns 404, and `/api/revisions` returns the heuristic prompts.
5. **A billing outage is not a bad prompt** — `POST /api/compose` turns any `consumeSlot` throw into "Could not generate that chart. Try again in a moment." Check: a Convex or billing exception names billing, and it does not refund a slot that was never taken.
6. **CI fails when generate cannot** — The `checks` job does not call compose. The probe opens the homepage. The missing model shipped with `checks` green. Check: CI rejects a compose or lookup model id that is not on the live allowlist, and one catalog prompt test asserts an official source on the minted chart.

## Shipped
- **Clear generate button on the homepage** — 2026-10-23. Live CTA is "Generate my chart". Already on vizzy.run. [35511fa](https://github.com/bytesofconnor/vizzy/commit/35511fabd79e0a310a5195cecdff2e25698c99d0).
- **Pricing line on the homepage** — 2026-10-23. Live note is "3 free today, then $8 for 25". Pack infra is `FREE_PER_DAY=3`, `PACK_CREDITS=25`, `PACK_CENTS=800`, Stripe and Convex. Already on vizzy.run. Copy in [35511fa](https://github.com/bytesofconnor/vizzy/commit/35511fabd79e0a310a5195cecdff2e25698c99d0). Constants in [6e004ec](https://github.com/bytesofconnor/vizzy/commit/6e004ecfa03f5c21676151a55477ae3e8efe7add).

## Later, after reliability
- Personal chart library — a growth bet, not a fix for a chart that fails.
- Edit a published chart at the same URL — the open chart can already be revised. A stable public id is later.
- MCP expansion — `apps/mcp` already lists schema, validate, compile, and publish. New hosts are later.
- Source picking with Jev.
- My BI live pins.

## Not doing
- Product Hunt launch — premature until the homepage converts and the chart loop is proven.
- Broad "ChatGPT for BI" positioning — Vizzy is chart excellence first; My BI is later.
