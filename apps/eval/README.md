# @vizzy/eval

Offline **chart eval lab**. Isolated from Next, Convex, Stripe, and billing.

The job is to learn which **prompt styles**, **data situations**, and **models** produce paste-ready Vizzy charts — then emit **draft recommendations** a human accepts into `from-prompt` / fixtures. It does **not** auto-merge product changes. It does **not** call the compose API unless you wire a mapper.

## What a batch is

| Axis | v1 |
|------|-----|
| Prompt styles | short, time, ranking, compare, pasted, overloaded |
| Data situations | lookup hit, lookup miss, in-progress year, pasted numbers |
| Cells | **24** (style × situation) |
| Repeats | **2 seeds** (brittleness) |
| Models | `compose-default` and `compose-challenger` in the canned world |

Canned run = **96 scored drafts**, no network. Defects are planted on purpose (placeholders, invented URLs, type mismatch, pasted-y drift) so the pipeline has something to learn from before anyone spends gateway tokens.

## Quality (mechanical)

`checkDraft` uses `@vizzy/core` `compileChart` plus Vizzy rules from AGENTS.md:

- Compile / mapping / numeric y
- Axis labels are words, not `x` / `y`
- No `Country A` / rank-index x
- Lookup miss: not official/scraped + **no URL**
- Lookup hit: not a sourceless estimate
- Time-like x → line; named ranking → bar
- History / in-progress: enough rows; `forecastFrom` set
- Pasted numbers: y values must match

Taste (“would I paste this?”) is **you** on the fail pile — not a second model on every cell.

## CLI

```bash
npm test --workspace=@vizzy/eval
npm run build --workspace=@vizzy/eval
npx vizzy-eval grid          # 24 cells
npx vizzy-eval run           # canned briefing
npx vizzy-eval run --json    # report JSON (admin ingest later)
npx vizzy-eval cases         # failing cells
```

From the app folder after build: `node dist/cli.js run`.

## Live compose (paid, optional)

`runComposeBatch` takes an injected `compose(prompt, model, seed) → draft`. Tests stub it. A future share adapter can POST `/api/compose` — that **costs the same as generating charts**. Do not put it on a Convex cron. Re-run the **same 24 prompts** when SYSTEM or models change.

## Into product

Recs are tagged `fixture` | `system` | `rewriter` | `model_routing`. Accept by editing core/share yourself. Do not apply recs automatically.

Admin UI on vizzy.run is **not** in this app. Dump `--json` when you want a briefing; Convex ingest can come later without coupling this package to the site.

## Layout

```
apps/eval/src/
  grid.ts        24 tagged prompts
  check.ts       mechanical issues
  canned.ts      2×2×24 synthetic drafts
  aggregate.ts   rates + brittle cells
  recommend.ts   deterministic admin recs
  compose.ts     injectable live batch
  cli.ts
```
