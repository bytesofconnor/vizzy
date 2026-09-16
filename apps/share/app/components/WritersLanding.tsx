import Link from 'next/link';
import { PIECES } from '../../lib/pieces';
import { DUST, STUDIO } from '../../lib/theme';
import { ComposeBox } from './ComposeBox';
import { DustRail } from './DustRail';
import { KickerNav } from './KickerNav';
import { SiteFoot } from './SiteFoot';

const WORKFLOWS = [
  {
    label: 'Newsletter',
    detail: 'Export a PNG at S, M, or L and drop it into Substack, Ghost, or Mailchimp.',
    tone: DUST[0],
  },
  {
    label: 'Blog post',
    detail: 'Paste the PNG in your CMS. Link the chart caption to the permanent vizzy.run URL.',
    tone: DUST[4],
  },
  {
    label: 'Report',
    detail: 'Keep the source line on the chart for footnotes. Revise in plain English until it reads right.',
    tone: DUST[6],
  },
] as const;

const WRITER_EXAMPLE_SLUGS = ['vinyl', 'ozone', 'reef'] as const;

export function WritersLanding({
  error,
  askPay,
  email,
  known,
  owner = false,
}: {
  error?: string;
  askPay?: boolean;
  email?: string;
  known?: boolean;
  owner?: boolean;
}) {
  const examples = WRITER_EXAMPLE_SLUGS.map((slug) => PIECES.find((piece) => piece.slug === slug)).filter(
    (piece): piece is NonNullable<typeof piece> => piece !== undefined
  );

  return (
    <main id="content" className="page-main page-writers">
      <KickerNav here="home" email={email} known={known} owner={owner} />
      <section className="writers-hero" aria-labelledby="writers-title">
        <p className="writers-kicker">For writers</p>
        <h1 id="writers-title" className="writers-title">
          Charts you can paste into your draft
        </h1>
        <DustRail className="writers-dust dust-rail" />
        <p className="writers-lede">
          Writing a newsletter, blog post, or report? Type what you want to show. Get a link and PNG you
          can drop anywhere — with the source on the chart.
        </p>
        <p className="writers-trust">We won&apos;t invent a source link.</p>
        <ComposeBox error={error} askPay={askPay} variant="hero" />
      </section>
      <section className="writers-workflows" aria-labelledby="writers-workflows-title">
        <h2 id="writers-workflows-title" className="writers-section-kicker">
          Three ways to ship it
        </h2>
        <ul className="writers-workflow-list">
          {WORKFLOWS.map((step) => (
            <li key={step.label} className="writers-workflow-item">
              <i
                style={{ background: step.tone === DUST[6] ? STUDIO.ink : step.tone }}
                aria-hidden="true"
              />
              <div>
                <p className="writers-workflow-label">{step.label}</p>
                <p className="writers-workflow-detail">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="writers-examples" aria-labelledby="writers-examples-title">
        <h2 id="writers-examples-title" className="writers-section-kicker">
          Example charts with sources
        </h2>
        <ul className="writers-example-list">
          {examples.map((piece) => (
            <li key={piece.slug}>
              <Link href={`/c/${piece.slug}`} className="writers-example-card">
                <p className="writers-example-kicker">{piece.kicker}</p>
                <p className="writers-example-title">{piece.title}</p>
                <p className="writers-example-note">{piece.note}</p>
                {piece.config.source ? (
                  <p className="writers-example-source">{piece.config.source.label}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFoot />
    </main>
  );
}
