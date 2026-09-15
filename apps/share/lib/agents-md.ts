import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

export function agentsMarkdown(): string {
  return readFileSync(join(process.cwd(), 'content/AGENTS.md'), 'utf8');
}

export function renderAgentsMarkdown(markdown: string): ReactNode {
  const blocks = markdown.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  return blocks.map((block, index) => renderBlock(block, index));
}

function renderBlock(block: string, index: number): ReactNode {
  if (block.startsWith('# ')) {
    return createElement('h1', { key: index, className: 'agents-title' }, renderInline(block.slice(2)));
  }
  if (block.startsWith('## ')) {
    return createElement('h2', { key: index, className: 'agents-kicker' }, renderInline(block.slice(3)));
  }
  if (block.startsWith('```')) {
    const lines = block.split('\n');
    const code = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n');
    return createElement('pre', { key: index, className: 'agents-code' }, createElement('code', null, code));
  }
  if (block.split('\n').every((line) => line.startsWith('- '))) {
    return createElement(
      'ul',
      { key: index, className: 'agents-list' },
      block.split('\n').map((line, item) => createElement('li', { key: item }, renderInline(line.slice(2))))
    );
  }
  return createElement('p', { key: index, className: 'agents-p' }, renderInline(block));
}

function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(createElement('code', { key: key++ }, token.slice(1, -1)));
    } else if (token.startsWith('**')) {
      nodes.push(createElement('strong', { key: key++ }, token.slice(2, -2)));
    } else {
      nodes.push(
        createElement(
          'a',
          { key: key++, href: token.replace(/[.,)]$/, ''), rel: 'noreferrer' },
          token
        )
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return createElement(Fragment, null, ...nodes);
}
