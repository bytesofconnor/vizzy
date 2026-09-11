# Vizzy

A chart you can paste. An agent gathers the rows. You get a link and a PNG.

**https://vizzy-ruddy.vercel.app**

Not a D3 playground. Not a chart grammar. Bar, line, or scatter — taste is fixed. Copy the image into Notion, Docs, or a blog.

## How it works

1. Rows plus a short `source` (where they came from — say so if you don't have one).
2. Share mints a page and a PNG (`apps/share`).
3. You pick a size when you copy. Size is an export, not a compile.

The thing people use is **`apps/share`**. That is the gallery, the paste URL, and the image.

## MCP

Yes — if your chat can call MCP tools. Claude, Cursor, ChatGPT, whatever speaks the protocol. MCP is how an agent publishes. It is not how anyone else "installs" Vizzy, and it is not the product.

```bash
npx vizzy-mcp start
```

`publish_chart` is the tool that matters. It posts to share (`VIZZY_SHARE_URL`, default `https://vizzy-ruddy.vercel.app`) and returns a URL plus PNG. The other tools (`get_schema`, `validate_config`, `suggest_chart`, `compile_chart`) help the agent emit a valid `ChartConfig` first. Do not invent D3.

Agent contract: `AGENTS.md`.

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
