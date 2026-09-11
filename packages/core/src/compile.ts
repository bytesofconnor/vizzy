import { suggestChart, SuggestHints } from './suggest';
import { ChartConfig, ChartValidationResult, ValidationIssue } from './types';
import { validateChartRequest } from './validate';

export interface CompileInput {
  config?: unknown;
  data: unknown;
  hints?: SuggestHints;
}

export interface CompileSnippet {
  package: string;
  tsx: string;
}

export interface CompileResult extends ChartValidationResult {
  warnings: string[];
  snippet: CompileSnippet;
}

function snippetFor(config: ChartConfig | undefined): CompileSnippet {
  const configLiteral = config
    ? JSON.stringify(config, null, 2)
    : '{ /* invalid config — fix issues first */ }';

  return {
    package: '@vizzy/react',
    tsx: `import { VizzyChart } from '@vizzy/react';

const config = ${configLiteral};

export function Chart({ data }) {
  return <VizzyChart config={config} data={data} />;
}
`,
  };
}

function warningsFrom(issues: ValidationIssue[]): string[] {
  return issues
    .filter((issue) => issue.code === 'EMPTY_DATA' || issue.code === 'WEAK_X_MAPPING')
    .map((issue) => issue.message);
}

/**
 * Compile a chart request to a validated ChartConfig plus a fixed host snippet.
 * Never returns generated D3 or component source.
 */
export function compileChart(input: CompileInput): CompileResult {
  let config = input.config;

  if (config == null) {
    const suggestions = suggestChart(input.data, input.hints);
    config = suggestions[0]?.config;
  }

  if (config == null) {
    const issues: ValidationIssue[] = [
      {
        path: 'data',
        code: 'NO_SUGGESTION',
        message: 'Could not infer a chart from this data',
        suggestion: 'Pass an explicit config with chart.type and dataMapping.x/y',
      },
    ];
    return {
      valid: false,
      issues,
      warnings: [],
      snippet: snippetFor(undefined),
    };
  }

  const result = validateChartRequest(config, input.data);
  return {
    ...result,
    warnings: warningsFrom(result.issues),
    snippet: snippetFor(result.config),
  };
}
