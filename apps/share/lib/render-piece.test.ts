import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { pieceBySlug } from './pieces';
import { renderPiecePng } from './render-piece';

const PNG_SIGNATURE = '89504e470d0a1a0a';

describe('chart png', () => {
  it('loads jsdom when Node refuses require() of an ES module', () => {
    const result = spawnSync(
      process.execPath,
      ['--no-experimental-require-module', '-e', "require('jsdom')"],
      { encoding: 'utf8' }
    );
    expect(result.stderr ?? '').not.toContain('ERR_REQUIRE_ESM');
    expect(result.status).toBe(0);
  });

  it('renders a published chart as a png', async () => {
    const piece = pieceBySlug('reef');
    expect(piece).toBeTruthy();
    const png = await renderPiecePng(piece!);
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
  });
});
