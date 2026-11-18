import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DraftSchema } from './from-prompt';
import { IdeaSchema } from './hero-ideas-ai';
import { RevisionSchema } from './revision-suggestions';

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
};

function asJsonSchema(schema: z.ZodType): JsonSchema {
  return z.toJSONSchema(schema) as JsonSchema;
}

/** OpenAI strict response_format: every property is required. Optional fields are nullable. */
export function strictViolations(schema: JsonSchema, path = '$'): string[] {
  const violations: string[] = [];
  const properties = schema.properties;
  if (properties) {
    const required = new Set(schema.required ?? []);
    for (const key of Object.keys(properties)) {
      if (!required.has(key)) {
        violations.push(`${path}.properties.${key} is missing from required`);
      }
      violations.push(...strictViolations(properties[key] ?? {}, `${path}.properties.${key}`));
    }
    if (schema.additionalProperties === true) {
      violations.push(`${path} sets additionalProperties true`);
    }
  }
  const items = schema.items;
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      violations.push(...strictViolations(item, `${path}.items.${index}`));
    });
  } else if (items) {
    violations.push(...strictViolations(items, `${path}.items`));
  }
  for (const branch of [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]) {
    violations.push(...strictViolations(branch, path));
  }
  return violations;
}

describe('structured output schemas', () => {
  it('keeps compose, revisions, and prompt-ideas strict', () => {
    const schemas = [
      ['compose', DraftSchema],
      ['revisions', RevisionSchema],
      ['prompt-ideas', IdeaSchema],
    ] as const;
    for (const [name, schema] of schemas) {
      expect(strictViolations(asJsonSchema(schema)), name).toEqual([]);
    }
  });

  it('makes the compose series field nullable and required', () => {
    const json = asJsonSchema(DraftSchema);
    const row = json.properties?.rows?.items;
    const series = !Array.isArray(row) ? row?.properties?.series : undefined;
    expect(row && !Array.isArray(row) ? row.required : []).toContain('series');
    const text = JSON.stringify(series);
    expect(text).toContain('null');
  });
});
