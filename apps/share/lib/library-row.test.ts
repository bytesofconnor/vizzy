import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountLibrary } from '../app/components/AccountLibrary';

describe('account library', () => {
  it('lists a chart the account just saved', () => {
    const html = renderToStaticMarkup(
      createElement(AccountLibrary, {
        saved: true,
        initial: {
          page: [
            {
              slug: 'unrate26',
              title: 'US Monthly Unemployment Rate, 2026',
              route: 'compose' as const,
              createdAt: Date.UTC(2026, 10, 15, 12),
            },
          ],
          isDone: true,
          continueCursor: '',
        },
      })
    );
    expect(html).toContain('US Monthly Unemployment Rate, 2026');
    expect(html).toContain('/c/unrate26');
    expect(html).not.toContain('Charts you make show up here as paste links');
  });
});
