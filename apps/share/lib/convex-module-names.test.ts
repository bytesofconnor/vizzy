import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CONVEX_PATH_COMPONENT = /^[A-Za-z0-9_.]+$/;

function convexPathOffenders(root: string): string[] {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (!CONVEX_PATH_COMPONENT.test(entry.name)) {
        offenders.push(relative(root, full));
      }
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(root);
  return offenders.sort();
}

const convexRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../convex'
);

describe('convex module paths', () => {
  it('reports a hyphenated name', () => {
    const root = mkdtempSync(join(tmpdir(), 'convex-path-'));
    writeFileSync(join(root, 'free-charts.ts'), '');
    mkdirSync(join(root, '_generated'));
    writeFileSync(join(root, '_generated', 'api.js'), '');
    expect(convexPathOffenders(root)).toEqual(['free-charts.ts']);
  });

  it('keeps every name under convex/ to letters, digits, underscores, and periods', () => {
    expect(convexPathOffenders(convexRoot)).toEqual([]);
  });
});
