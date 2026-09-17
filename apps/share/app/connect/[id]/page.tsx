import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CONNECTOR_BY_ID, isConnectorId } from '../../../lib/connectors/catalog';
import { ConnectorLogo } from '../../components/ConnectorLogo';
import { KickerNav } from '../../components/KickerNav';

export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isConnectorId(id)) {
    notFound();
  }
  const connector = CONNECTOR_BY_ID[id];

  return (
    <main id="content" className="page-main">
      <KickerNav here="home" />
      <section style={{ maxWidth: 520, margin: '24px auto 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ConnectorLogo id={id} size={32} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 500 }}>{connector.name}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--mute)', fontSize: 14 }}>{connector.blurb}</p>
          </div>
        </div>

        {id === 'sheets' ? (
          <div style={{ marginTop: 24 }}>
            <p style={{ lineHeight: 1.5 }}>
              Connected. Paste a Google Sheets URL into the home prompt, or share a link like{' '}
              <code>docs.google.com/spreadsheets/d/…</code> — vizzy will read the tab you name.
            </p>
            <p style={{ marginTop: 16 }}>
              <Link href="/">Back to chart</Link>
            </p>
          </div>
        ) : (
          <p style={{ marginTop: 24 }}>
            <Link href="/">Back to chart</Link>
          </p>
        )}
      </section>
    </main>
  );
}
