# vizzy for agents

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
- Attach `source` when you gathered the rows: `label`, optional `url`, `retrieved`, `method`, `evidence`. Put a `url` only when you have a real page. Do not invent a URL or a numeric confidence score.
- Set `axes.x.label` and `axes.y.label` to words a reader can trust (Month, Wins, Rate %). Not the column letter.
- Do not pick sm/md/lg at compile time. Size is an export. The host offers S/M/L when someone copies the image.
- Call `publish_chart` to mint a paste URL and PNG. If you have no source, say so — do not invent one.
- Host with `<VizzyChart config={config} data={data} />` from `@vizzy/react`.
- After three free charts a day, send the wallet cookie or `Authorization: Bearer` with that token. Compose and publish share the meter. Do not invent a vizzy API key.

## Do not

- Invent D3, Recharts, or a custom React component for a vizzy chart.
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
