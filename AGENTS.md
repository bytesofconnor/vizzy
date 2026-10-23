# Vizzy for agents

You gather rows. You call `publish_chart`, or `POST /api/compose` with a text prompt. The human gets a paste URL and a PNG. Humans type on the site; there is no voice API.

Public contract: https://vizzy.run/llms.txt · https://vizzy.run/agents · https://vizzy.run/openapi.json

You emit a `ChartConfig`. The runtime draws the SVG. Do not invent D3.

## Do

- Emit `ChartConfig` v1 (`schemaVersion: 1`).
- Set `chart.type` to `bar`, `line`, or `scatter`.
- Set `dataMapping.x` and `dataMapping.y` to **column names that exist** on the data rows.
- Keep `y` numeric. Use `bar` for categorical x, `line` for time-like x, `scatter` for two numerics.
- If a year is still in progress, do not draw later months as fact. Set `chart.forecastFrom` to the first unpublished x. The runtime dashes that tail.
- Call `validate_config` or `compile_chart` when unsure.
- Attach `source` when you gathered the rows: `label`, optional `url`, `retrieved`, `method`, `evidence`. Put a `url` when you have a real page. Do not invent a URL or a numeric confidence score.
- Set `axes.x.label` and `axes.y.label` to words a reader can trust (Month, Wins, Rate %). Not the column letter.
- Do not pick sm/md/lg at compile time. Size is an export. The host offers S/M/L when someone copies the image.
- Call `publish_chart` to mint a paste URL and PNG. If you have no source, say so — do not invent one.
- Host with `<VizzyChart config={config} data={data} />` from `@vizzy/react`.
- After three free charts a day, send the wallet cookie or `Authorization: Bearer` with that token. Compose and publish share the meter. Do not invent a Vizzy API key.

## Do not

- Invent D3, Recharts, or a custom React component for a Vizzy chart.
- Use `generate_chart`, voice input, or collaboration — not in v1.
- Add pie, heatmap, or other types. They are not in v1.

## Schema

Read `packages/core/src/schema/chart-config.v1.json`, `GET https://vizzy.run/schema/chart-config.v1.json`, or the `get_schema` MCP tool.

Minimal valid config:

```json
{
  "schemaVersion": 1,
  "chart": { "type": "bar" },
  "dataMapping": { "x": "month", "y": "revenue" }
}
```

If validation fails, fix the issue `path` (for example `dataMapping.y`) using the `suggestion`. Do not rewrite the renderer.

Agents in this repo work under `/poteto-mode`.
Use Cursor first. Agents default every role and every launch to Cursor models first, grok-4.7, grok-4.6, and composer-2.5.
Claude, GPT, and other models are an opt-in upgrade for a task that clearly needs one, while quota remains.
If an other-model call is refused for usage, retry immediately on a Cursor model without stopping.

## Auto-merge

A pull request from this repository squash-merges when its required checks pass. That includes a cloud-agent branch, every Dependabot update (patch, minor, major, and GitHub Actions), and a diff that edits `.github/**`, `.cursor/rules/**`, or `AGENTS.md`.

A pull request from a fork waits for Connor.

The workflow trigger is `pull_request`. Do not switch it to `pull_request_target`. Permissions stay `contents: write` and `pull-requests: write`. A draft is skipped until it is marked ready.

Eval publish writes to production Convex when a pull request into `main` closes as merged, after the CI job `checks` has succeeded on that head. A merge made with `GITHUB_TOKEN` does not start a workflow that listens to `push`. Full e2e still listens to `push` on `main`.

## Vercel builds

Hobby builds are limited.
The vizzy project builds from `apps/share`. The canopy-charts project builds from the repository root.
A project skips its build when the commit does not change its root.
A project skips preview builds whose branch starts with `dependabot/` or `cursor/`.
A production build still runs when its root changes.
If the parent commit is missing, the build runs.
Dependabot opens one npm pull request and one GitHub Actions pull request each week, including major updates.
