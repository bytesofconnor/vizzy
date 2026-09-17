import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';
import { renderToSVG, validateChartConfig } from '@vizzy/core';
import { CARDS, composePieceSvg, chartFrame, type CardSize } from './compose';
import type { Piece } from './pieces';
import { STUDIO } from './theme';

function fontPath(file: string): string {
  const candidates = [
    path.join(process.cwd(), 'fonts', file),
    path.join(process.cwd(), 'apps/share/fonts', file),
    path.join(__dirname, '../../fonts', file),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`${file} not found. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

const NODE_GLOBALS = {
  window: globalThis.window,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  SVGElement: globalThis.SVGElement,
  Node: globalThis.Node,
};

let domLock: Promise<void> = Promise.resolve();

function withDom<T>(run: () => Promise<T>): Promise<T> {
  const exclusive = async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true,
      url: 'http://127.0.0.1/',
    });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      HTMLElement: dom.window.HTMLElement,
      SVGElement: dom.window.SVGElement,
      Node: dom.window.Node,
    });
    try {
      return await run();
    } finally {
      Object.assign(globalThis, NODE_GLOBALS);
      dom.window.close();
    }
  };
  const started = domLock.then(exclusive, exclusive);
  domLock = started.then(
    () => undefined,
    () => undefined
  );
  return started;
}

export async function renderPiecePng(
  piece: Piece,
  size: CardSize = 'md',
  options?: { insight?: string }
): Promise<Buffer> {
  const frame = chartFrame(size);
  const config = validateChartConfig({
    ...piece.config,
    dimensions: {
      ...piece.config.dimensions,
      width: frame.width,
      height: frame.height,
      margin: frame.margin,
    },
  });
  const chartSvg = await withDom(() => renderToSVG(config, piece.data));
  const card = composePieceSvg({ ...piece, config }, chartSvg, size, options);
  const resvg = new Resvg(card, {
    fitTo: { mode: 'width', value: CARDS[size].width },
    background: STUDIO.paper,
    font: {
      fontFiles: [fontPath('Archivo-Regular.ttf'), fontPath('IBMPlexMono-Regular.ttf')],
      defaultFontFamily: 'Archivo',
      loadSystemFonts: false,
    },
  });
  return Buffer.from(resvg.render().asPng());
}
