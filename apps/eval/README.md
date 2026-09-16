# @vizzy/eval

Mechanical chart eval. Isolated from Next and billing.

**Grid:** 6 prompt styles × 4 data situations = 24 cells, × 2 models × 2 seeds = 96 drafts. No compose API. No schedule.

**CI:** tests on every PR and push to `main`. On push to `main` after `check` passes, `vizzy-eval run --publish` writes the summary to Convex. `/admin` reads the latest run.

**CLI**

```bash
npm test --workspace=@vizzy/eval
npm run build --workspace=@vizzy/eval
node apps/eval/dist/cli.js run
node apps/eval/dist/cli.js run --publish   # CONVEX_URL + COMPOSE_SERVER_SECRET
```

Recs are drafts. Do not auto-merge into `from-prompt`.
