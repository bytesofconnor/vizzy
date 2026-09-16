# Vizzy

A chart you can paste. An agent gathers the rows. You get a link and a PNG.

**https://vizzy.run**

Not a D3 playground. Not a chart grammar. Bar, line, or scatter — taste is fixed. Copy the image into Notion, Docs, or a blog.

## How it works

1. Rows plus a short `source` (where they came from — say so if you don't have one).
2. Share mints a page and a PNG (`apps/share`).
3. You pick a size when you copy. Size is an export, not a compile.

The thing people use is **`apps/share`**. That is the gallery, the paste URL, and the image.

## Anybody

Type what you want on the site, or `POST /api/compose` with `{ "prompt": "..." }`. You get a chart URL and a PNG. Bots that can submit a form or POST JSON can use the same door.

The local MCP (`publish_chart`) is still there for chats that already speak tools. Agent contract: [`AGENTS.md`](AGENTS.md), live at https://vizzy.run/agents. OpenAPI: https://vizzy.run/openapi.json.

```bash
npx tsx apps/mcp/src/cli.ts
```

Dashboards, env vars, and which file Next actually reads: **[docs/ops.md](docs/ops.md)**.

## Local

```bash
npm install
cd apps/share && npx next dev -p 3456
```

Studio pieces: `/c/july`, `/c/price`, `/c/corners`, `/c/tips`, `/c/keep`.  
Mint: `POST /api/publish` with `{ title, data, config?, source? }`. Compose and publish share three free charts a day.

## Packages

| Package | Role |
|---|---|
| `apps/share` | The product — page, PNG, mint |
| `@vizzy/eval` | Offline chart eval lab (prompt grid, scores, recs) |
| `@vizzy/mcp` | Pipe for any MCP client |
| `@vizzy/core` | Schema, validate, draw the SVG |
| `@vizzy/react` | `<VizzyChart config data />` on a live page |

Supported types: **bar**, **line**, **scatter**. Line charts may set `area: true`.

## Develop

```bash
npm test
npm run eval
npm run test:e2e
npm run type-check
```

E2E is Playwright in `apps/share`. Home + axe run on pull requests. Full billing e2e runs in GitHub Actions on push to `main`. Secrets and service links: [docs/ops.md](docs/ops.md).
