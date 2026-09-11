import { describe, expect, it } from 'vitest';
import { dispatchTool, TOOL_DEFINITIONS } from './tools';

const data = [
  { month: 'Jan', revenue: 4000, users: 240 },
  { month: 'Feb', revenue: 3000, users: 139 },
];

describe('MCP tools', () => {
  it('lists the compiler tools plus publish', () => {
    expect(TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      'get_schema',
      'validate_config',
      'suggest_chart',
      'compile_chart',
      'publish_chart',
    ]);
  });

  it('get_schema returns ChartConfig v1', async () => {
    const result = (await dispatchTool('get_schema', {})) as { schemaVersion: number; schema: { title?: string } };
    expect(result.schemaVersion).toBe(1);
    expect(result.schema.title).toContain('ChartConfig');
  });

  it('validate_config accepts the sample table', async () => {
    const result = (await dispatchTool('validate_config', {
      config: { chart: { type: 'bar' }, dataMapping: { x: 'month', y: 'revenue' } },
      data,
    })) as { valid: boolean };
    expect(result.valid).toBe(true);
  });

  it('compile_chart returns a host snippet, not D3 source', async () => {
    const result = (await dispatchTool('compile_chart', { data })) as {
      valid: boolean;
      snippet: { tsx: string };
    };
    expect(result.valid).toBe(true);
    expect(result.snippet.tsx).toContain('@vizzy/react');
    expect(result.snippet.tsx).not.toContain('d3.select');
  });

  it('publish_chart requires a title and rows', async () => {
    const result = (await dispatchTool('publish_chart', { data })) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/title and data/);
  });

  it('rejects unknown tools', async () => {
    await expect(dispatchTool('generate_chart', {})).rejects.toThrow(/Unknown tool/);
  });
});
