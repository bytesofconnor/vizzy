import {
  chartConfigJsonSchema,
  compileChart,
  suggestChart,
  validateChartRequest,
} from '@vizzy/core';

export const TOOL_DEFINITIONS = [
  {
    name: 'get_schema',
    description:
      'Return ChartConfig JSON Schema v1. Agents should emit this shape. Do not invent D3.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_config',
    description:
      'Validate a ChartConfig against a dataset. Returns field-level issues when invalid.',
    inputSchema: {
      type: 'object',
      properties: {
        config: { type: 'object', description: 'ChartConfig v1 object' },
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Rows the config will render',
        },
      },
      required: ['config', 'data'],
    },
  },
  {
    name: 'suggest_chart',
    description:
      'Heuristic ChartConfig suggestions from a table. No model. Returns up to 3 ranked configs.',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Tabular rows',
        },
        chartType: {
          type: 'string',
          enum: ['bar', 'line', 'scatter'],
          description: 'Optional preferred chart type',
        },
        title: { type: 'string' },
      },
      required: ['data'],
    },
  },
  {
    name: 'compile_chart',
    description:
      'Validate (or infer) a ChartConfig and return a fixed @vizzy/react snippet. Never returns generated D3 source.',
    inputSchema: {
      type: 'object',
      properties: {
        config: { type: 'object', description: 'Optional ChartConfig. Inferred from data if omitted.' },
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        chartType: {
          type: 'string',
          enum: ['bar', 'line', 'scatter'],
        },
        title: { type: 'string' },
      },
      required: ['data'],
    },
  },
  {
    name: 'publish_chart',
    description:
      'Publish rows to Vizzy share and get a paste URL plus PNG. This is the product action. Attach source when you gathered the data. Include a real url if you have one — do not invent a link or a confidence score. Set axes.x.label and axes.y.label. Uses VIZZY_SHARE_URL (default https://vizzy-ruddy.vercel.app).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        kicker: { type: 'string' },
        note: { type: 'string' },
        config: { type: 'object', description: 'Optional ChartConfig. Inferred from data if omitted.' },
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        source: {
          type: 'object',
          description: 'Where the rows came from',
          properties: {
            label: { type: 'string' },
            url: { type: 'string' },
            retrieved: { type: 'string' },
            method: {
              type: 'string',
              enum: ['official', 'export', 'scraped', 'estimate', 'manual', 'example', 'unknown'],
            },
            evidence: { type: 'string' },
          },
        },
      },
      required: ['title', 'data'],
    },
  },
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number]['name'];

export function handleGetSchema() {
  return {
    schemaVersion: 1,
    schema: chartConfigJsonSchema,
  };
}

export function handleValidateConfig(args: { config: unknown; data: unknown }) {
  return validateChartRequest(args.config, args.data);
}

export function handleSuggestChart(args: {
  data: unknown;
  chartType?: 'bar' | 'line' | 'scatter';
  title?: string;
}) {
  return {
    suggestions: suggestChart(args.data, {
      chartType: args.chartType,
      title: args.title,
    }),
  };
}

export function handleCompileChart(args: {
  config?: unknown;
  data: unknown;
  chartType?: 'bar' | 'line' | 'scatter';
  title?: string;
}) {
  return compileChart({
    config: args.config,
    data: args.data,
    hints: {
      chartType: args.chartType,
      title: args.title,
    },
  });
}

export async function handlePublishChart(args: {
  title?: unknown;
  kicker?: unknown;
  note?: unknown;
  config?: unknown;
  data?: unknown;
  source?: unknown;
}) {
  const title = typeof args.title === 'string' ? args.title.trim() : '';
  if (!title || !Array.isArray(args.data)) {
    return { ok: false, error: 'title and data are required' };
  }

  const base = (process.env.VIZZY_SHARE_URL ?? 'https://vizzy-ruddy.vercel.app').replace(/\/$/, '');

  try {
    const response = await fetch(`${base}/api/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        kicker: args.kicker,
        note: args.note,
        config: args.config,
        data: args.data,
        source: args.source,
      }),
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return {
        ok: false,
        error: typeof payload.error === 'string' ? payload.error : `Publish failed (${response.status})`,
        issues: payload.issues ?? [],
      };
    }
    return payload;
  } catch {
    return {
      ok: false,
      error: `Could not reach Vizzy share at ${base}. Set VIZZY_SHARE_URL if you are pointing somewhere else.`,
    };
  }
}

export async function dispatchTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_schema':
      return handleGetSchema();
    case 'validate_config':
      return handleValidateConfig({
        config: args.config,
        data: args.data,
      });
    case 'suggest_chart':
      return handleSuggestChart({
        data: args.data,
        chartType: args.chartType as 'bar' | 'line' | 'scatter' | undefined,
        title: args.title as string | undefined,
      });
    case 'compile_chart':
      return handleCompileChart({
        config: args.config,
        data: args.data,
        chartType: args.chartType as 'bar' | 'line' | 'scatter' | undefined,
        title: args.title as string | undefined,
      });
    case 'publish_chart':
      return handlePublishChart(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
