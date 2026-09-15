# @vizzy/mcp

Stdio MCP server for Vizzy. Compile ChartConfig v1 locally. Publish a paste URL and PNG.

From this repo:

```bash
npx tsx apps/mcp/src/cli.ts
```

Tools: `get_schema`, `validate_config`, `suggest_chart`, `compile_chart`, `publish_chart`.

```bash
export VIZZY_SHARE_URL=https://vizzy.run
export VIZZY_WALLET_TOKEN=   # vizzy_wallet cookie after three free charts a day
```

Intended global install once `@vizzy/core` is on npm too: `npm i -g @vizzy/mcp`.

Contract: https://vizzy.run/agents · https://vizzy.run/llms.txt · https://vizzy.run/openapi.json
