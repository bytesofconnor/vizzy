# Vizzy

A chart you can paste. An agent gathers the rows. You get a link and a PNG.

**https://vizzy-ruddy.vercel.app**

Not a D3 playground. Not a chart grammar. Bar, line, or scatter — taste is fixed. Copy the image into Notion, Docs, or a blog.

## How it works

1. Rows plus a short `source` (where they came from — say so if you don't have one).
2. Share mints a page and a PNG (`apps/share`).
3. You pick a size when you copy. Size is an export, not a compile.

The thing people use is **`apps/share`**. That is the gallery, the paste URL, and the image.

## Anybody

The public site is the picture. The anybody-path is a connector inside Claude or ChatGPT — add Vizzy once, like a tool. That hosted connector is not live yet.

Developers can still run the local MCP in this repo (`@vizzy/mcp` → `publish_chart`). That is not how civilians install it. Agent contract: `AGENTS.md`.

## Local

```bash
npm install
cd apps/share && npx next dev -p 3456
```

Studio pieces: `/c/july`, `/c/price`, `/c/corners`, `/c/tips`, `/c/keep`.  
Mint: `POST /api/publish` with `{ title, data, config?, source? }`.

## Packages

| Package | Role |
|---|---|
| `apps/share` | The product — page, PNG, mint |
| `@vizzy/mcp` | Pipe for any MCP client |
| `@vizzy/core` | Schema, validate, draw the SVG |
| `@vizzy/react` | `<VizzyChart config data />` on a live page |

Supported types: **bar**, **line**, **scatter**. Line charts may set `area: true`.

## Develop

```bash
npm test
npm run type-check
```
