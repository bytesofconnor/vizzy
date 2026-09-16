'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ConnectorId } from '../../lib/connectors/catalog';
import { ConnectorLogo } from './ConnectorLogo';

type ConnectorRow = {
  id: ConnectorId;
  name: string;
  blurb: string;
  kind: 'oauth' | 'instant' | 'soon';
  available: boolean;
  connected: boolean;
  label?: string;
};

type Catalog = {
  connectors: ConnectorRow[];
  oauth: { google: boolean };
};

export function HeroConnectors({
  onInstant,
}: {
  onInstant: (prompt: string, focus: boolean) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancel = false;
    void fetch('/api/connectors')
      .then((response) => response.json())
      .then((body: unknown) => {
        if (cancel || !isCatalog(body)) {
          return;
        }
        setCatalog(body);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('connect_error');
    if (connected === 'sheets') {
      setNote('Google Sheets connected — paste a sheet link or chart a tab.');
      router.replace('/', { scroll: false });
    } else if (error) {
      setNote(
        error === 'google'
          ? 'Could not connect Google Sheets. Paste a sheet link in the box above.'
          : 'Could not connect that source. Try again.'
      );
      router.replace('/', { scroll: false });
    }
  }, [router, searchParams]);

  const connect = useCallback(
    (item: ConnectorRow) => {
      if (item.kind === 'soon' || !item.available) {
        return;
      }
      if (item.kind === 'instant') {
        const prompt =
          item.id === 'csv'
            ? ''
            : item.id === 'wikipedia'
              ? 'Chart the numbers from https://en.wikipedia.org/wiki/'
              : '';
        onInstant(prompt, true);
        setNote(item.id === 'csv' ? 'Paste a table into the box above.' : `Pick a ${item.name} topic or link.`);
        return;
      }
      if (item.kind === 'oauth') {
        if (item.connected) {
          router.push(`/connect/${item.id}`);
          return;
        }
        if (!catalog?.oauth.google) {
          onInstant('Chart from https://docs.google.com/spreadsheets/d/', true);
          setNote('Paste a Google Sheets link in the box above.');
          return;
        }
        window.location.assign(`/api/connectors/google/start?connector=${item.id}&return=/`);
      }
    },
    [catalog?.oauth.google, onInstant, router]
  );

  if (!catalog?.connectors.length) {
    return null;
  }

  return (
    <div className="hero-connectors">
      <p className="hero-connectors-kicker">Or connect a source</p>
      <ul className="hero-connectors-row">
        {catalog.connectors.map((item) => {
          const soon = item.kind === 'soon';
          return (
            <li key={item.id}>
              <button
                type="button"
                className={[
                  'hero-connector',
                  item.connected ? 'is-connected' : '',
                  soon ? 'is-soon' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={soon}
                aria-label={
                  soon
                    ? `${item.name} — coming soon`
                    : item.connected
                      ? `${item.name} connected`
                      : `Connect ${item.name}`
                }
                title={item.blurb}
                onClick={() => connect(item)}
              >
                <ConnectorLogo id={item.id} size={24} />
                <span className="hero-connector-name">{item.name}</span>
                {item.connected ? <i className="hero-connector-dot" aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {note ? (
        <p className="hero-connectors-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function isCatalog(value: unknown): value is Catalog {
  return (
    typeof value === 'object' &&
    value !== null &&
    'connectors' in value &&
    Array.isArray(value.connectors)
  );
}
