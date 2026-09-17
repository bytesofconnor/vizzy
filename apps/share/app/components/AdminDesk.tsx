'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ADMIN_VIEWS, type AdminView } from '../../lib/admin-view';

const COPY: Record<AdminView, { title: string; lede: string; label: string }> = {
  meter: {
    label: '30 days',
    title: 'Last 30 days',
    lede:
      'Charts generated counts every compose and publish. Saved links are charts someone can reopen on /me. AI spend only tracks calls after logging shipped.',
  },
  eval: {
    label: 'Eval',
    title: 'Eval',
    lede: 'Canned grid from CI on push to main. Recs regenerate each publish. Working / Park / GitHub are the human loop — they do not patch compose.',
  },
  log: {
    label: 'Activity',
    title: 'Activity',
    lede: 'Recent AI calls, saved charts, and site taps.',
  },
};

export function AdminDesk({
  view: initial,
  evalLabel = 'Eval',
  meter,
  evalPane,
  log,
}: {
  view: AdminView;
  evalLabel?: string;
  meter: ReactNode;
  evalPane: ReactNode;
  log: ReactNode;
}) {
  const pathname = usePathname();
  const [view, setView] = useState<AdminView>(initial);
  const copy = COPY[view];

  function go(next: AdminView) {
    setView(next);
    const url = next === 'meter' ? pathname : `${pathname}?view=${next}`;
    window.history.replaceState(null, '', url);
  }

  return (
    <>
      <nav className="admin-desk-nav" aria-label="admin sections">
        {ADMIN_VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            className={`admin-desk-tab${view === id ? ' is-on' : ''}`}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => go(id)}
          >
            {id === 'eval' ? evalLabel : COPY[id].label}
          </button>
        ))}
      </nav>
      <h1 className="admin-desk-title">{copy.title}</h1>
      <p className="admin-desk-lede">{copy.lede}</p>
      <div className="admin-desk-pane" hidden={view !== 'meter'}>
        {meter}
      </div>
      <div className="admin-desk-pane" hidden={view !== 'eval'}>
        {evalPane}
      </div>
      <div className="admin-desk-pane" hidden={view !== 'log'}>
        {log}
      </div>
    </>
  );
}
