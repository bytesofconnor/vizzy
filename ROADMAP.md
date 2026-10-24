# Vizzy Roadmap
Updated: 2026-10-24 · Owner: Vizzy · North star: pasteable, opinionated charts for writers (link + PNG), chart excellence before My BI.

## Open (ranked; knock off from the top)
1. **Standing live discovery.** Before other product work, run an anonymous pass on vizzy.run, file each failure as an Open item, and verify that path on the live site. Sessions on 2026-10-24 covered about nine charts, and the free tier then blocked more runs. One logged failure is "Top 10 countries by installed solar capacity in 2023", which charted new capacity, with "United States" cut to "States". Check: on https://vizzy.run, repeat that prompt, and either the chart is total installed capacity for 2023 or the title says it is new capacity. File whatever still fails as the next Open item.
2. **Honor the prompt, or say what changed.** "Top 10 countries by installed solar capacity in 2023" charted new capacity, not total installed capacity. "Brazil deforestation Amazon area lost per year since 2004" ignored the Amazon time series and returned a country ranking. "Who launches most satellites each year" returned only 2025. Its source was a scrape of itu.int. "Is the economy doing better?" did not ask a clarifying question, and the title claimed Sep 2026. Check: solar 2023 either matches installed capacity or the title says new capacity, Amazon deforestation since 2004 either is a year series or the title says country ranking, satellite launches either have one point per year or the title says a single year, and "Is the economy doing better?" does not title itself Sep 2026 unless the page has asked which measure.
3. **Match chart type, units, and rank encoding to the prompt.** "Fed funds since 2000" was a bar chart for a long time series. "Most popular baby names in the US 2023" drew bars by rank. Rank 1 was the shortest bar. Boys and girls were mixed. "Is the economy doing better?" put a rate and a count on one axis. Check: "Fed funds since 2000" is a line, "Most popular baby names in the US 2023" does not use rank as bar height and either separates boys and girls or says they are mixed, and "Is the economy doing better?" does not put a rate and a count on one axis.
4. **Keep source labels honest.** A vaccine and autism prompt was reframed, then the chart invented study counts. The source estimate said "No published page backs these numbers." "Wild tigers by country" labeled Wikipedia "official" and put no year in the title. Check: Wikipedia is not labeled official, the tiger title names a year, and the chart does not print counts when the source says no published page backs them.
5. **Keep labels readable.** Labels were cut at spaces. "United States" became "States", satellite labels became "States" and "Kingdom", and "Burkina Faso" became "Faso". The satellite long tail was unreadable. Fed funds ticks read "00/01". Arctic sea ice mixed year formats on the x-axis. Check: "United States" and "Burkina Faso" render in full, the satellite long tail is readable, fed funds ticks are not "00/01", and Arctic sea ice uses one year format.
6. **Finish the context panel.** On results read soon after render, including Arctic sea ice and the solar chart, the panel stayed on "Reading the chart…". Check: after a chart renders, the panel leaves "Reading the chart…" without a reload.
7. **Reset the composer, and show the chart URL in the address bar.** "New chart" cycles a demo prompt and does not clear the composer. A reload was required. Share copies a URL under https://vizzy.run/c/, and the address bar stays on /. Check: New chart clears the composer, and after generate the address bar is the /c/ URL that Share copies.
8. **Match the free-chart count to server enforcement before submit.** The counter went from 3 to 2 to 1, then back to 3. A later click hit a paywall while the idle page still said a free chart was available. After cookies were cleared, the homepage showed "3 free today", and POST /api/compose returned HTTP 402 with no chart. Check: when the homepage says "3 free today", POST /api/compose does not return HTTP 402, and the idle count matches the server before submit.

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
