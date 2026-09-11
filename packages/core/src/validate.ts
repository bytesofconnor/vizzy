import { z } from 'zod';
import {
  ChartConfigSchema,
  ChartValidationResult,
  DatasetSchema,
  ValidationIssue,
  VizzyError,
} from './types';

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value));
  }
  return false;
}

function availableFields(row: Record<string, unknown>): string {
  const keys = Object.keys(row);
  return keys.length > 0 ? keys.join(', ') : '(no columns)';
}

/**
 * Validate a chart request at the compiler boundary.
 * Returns field-level issues instead of throwing.
 */
export function validateChartRequest(
  config: unknown,
  data: unknown
): ChartValidationResult {
  const issues: ValidationIssue[] = [];

  const parsedConfig = ChartConfigSchema.safeParse(config);
  if (!parsedConfig.success) {
    for (const issue of parsedConfig.error.errors) {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      issues.push({
        path,
        code: String(issue.code).toUpperCase(),
        message: issue.message,
        suggestion: 'See ChartConfig v1 — chart.type and dataMapping.x/y are required',
      });
    }
    return { valid: false, issues };
  }

  const configValue = parsedConfig.data;
  const parsedData = DatasetSchema.safeParse(data);
  if (!parsedData.success) {
    issues.push({
      path: 'data',
      code: 'INVALID_DATA',
      message: 'Data must be an array of objects',
      suggestion: 'Pass an array like [{ month: "Jan", revenue: 4000 }]',
    });
    return { valid: false, config: configValue, issues };
  }

  const rows = parsedData.data;
  if (rows.length === 0) {
    issues.push({
      path: 'data',
      code: 'EMPTY_DATA',
      message: 'Dataset is empty',
      suggestion: 'Provide at least one row. Config is still valid.',
    });
    return { valid: true, config: configValue, issues };
  }

  const sample = rows[0];
  if (!sample) {
    issues.push({
      path: 'data',
      code: 'INVALID_DATA_STRUCTURE',
      message: 'Data array contains empty rows',
    });
    return { valid: false, config: configValue, issues };
  }

  const fields = availableFields(sample);
  const mapping = configValue.dataMapping;

  if (!(mapping.x in sample)) {
    issues.push({
      path: 'dataMapping.x',
      code: 'MISSING_FIELD',
      message: `Column '${mapping.x}' is not in the dataset`,
      suggestion: `Use one of: ${fields}`,
    });
  }

  if (!(mapping.y in sample)) {
    issues.push({
      path: 'dataMapping.y',
      code: 'MISSING_FIELD',
      message: `Column '${mapping.y}' is not in the dataset`,
      suggestion: `Use one of: ${fields}`,
    });
  }

  for (const optionalKey of ['color', 'size', 'group'] as const) {
    const column = mapping[optionalKey];
    if (column && !(column in sample)) {
      issues.push({
        path: `dataMapping.${optionalKey}`,
        code: 'MISSING_FIELD',
        message: `Column '${column}' is not in the dataset`,
        suggestion: `Use one of: ${fields}`,
      });
    }
  }

  if (mapping.y in sample) {
    const numericCount = rows.filter((row) => isNumeric(row[mapping.y])).length;
    if (numericCount === 0) {
      issues.push({
        path: 'dataMapping.y',
        code: 'NOT_NUMERIC',
        message: `Column '${mapping.y}' is not numeric`,
        suggestion: 'Map y to a numeric column',
      });
    }
  }

  const chartType = configValue.chart.type;
  if (chartType === 'line' || chartType === 'scatter') {
    if (mapping.x in sample) {
      const numericX = rows.filter((row) => isNumeric(row[mapping.x])).length;
      const looksTemporal = /date|time|month|year|week|day/i.test(mapping.x);
      if (chartType === 'scatter' && numericX === 0) {
        issues.push({
          path: 'dataMapping.x',
          code: 'NOT_NUMERIC',
          message: `Scatter plots need a numeric x column; '${mapping.x}' is not numeric`,
          suggestion: 'Map x to a numeric column, or use a bar chart',
        });
      }
      if (chartType === 'line' && numericX === 0 && !looksTemporal) {
        issues.push({
          path: 'dataMapping.x',
          code: 'WEAK_X_MAPPING',
          message: `Line charts work best with numeric or time-like x; '${mapping.x}' looks categorical`,
          suggestion: 'Use a bar chart, or map x to a time/number column',
        });
      }
    }
  }

  const blocking = issues.filter(
    (issue) => issue.code !== 'EMPTY_DATA' && issue.code !== 'WEAK_X_MAPPING'
  );

  return {
    valid: blocking.length === 0,
    config: configValue,
    issues,
  };
}

export function assertValidChartRequest(config: unknown, data: unknown) {
  const result = validateChartRequest(config, data);
  if (!result.valid || !result.config) {
    throw new VizzyError(
      'INVALID_CHART_REQUEST',
      result.issues[0]?.message ?? 'Chart request failed validation',
      { issues: result.issues },
      true
    );
  }
  return result;
}

export function zodIssuesToValidation(error: z.ZodError): ValidationIssue[] {
  return error.errors.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    code: String(issue.code).toUpperCase(),
    message: issue.message,
  }));
}
