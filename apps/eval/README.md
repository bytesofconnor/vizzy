# @vizzy/eval

Mechanical chart eval. Isolated from Next and billing.

**Grid:** 6 prompt styles × 4 data situations = 24 cells, × 2 models × 2 seeds = 96 drafts. No compose API. No schedule.

**CI:** tests on every PR and push to `main`. On push to `main` after `check` passes, `vizzy-eval run --publish` writes to **prod** Convex (`CONVEX_PROD_URL` + `COMPOSE_SERVER_SECRET_PROD`). `/admin` on vizzy.run reads that deployment. E2e keeps using the dev `CONVEX_URL`.

**CLI**

```bash
npm test --workspace=@vizzy/eval
npm run build --workspace=@vizzy/eval
node apps/eval/dist/cli.js run
node apps/eval/dist/cli.js run --publish   # CONVEX_URL + COMPOSE_SERVER_SECRET
```

Recs are drafts, regenerated on each publish. They do not auto-merge into `from-prompt`. On `/admin` Eval: **Working** (you are changing code), **Park** (hide until the grid drops it), **GitHub issue** (pre-filled). A rec leaves the list when the next CI eval no longer emits that id.
