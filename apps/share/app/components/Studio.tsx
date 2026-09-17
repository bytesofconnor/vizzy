import { PIECES, type Piece } from '../../lib/pieces';
import { AgentPaste } from './AgentPaste';
import { DustRail } from './DustRail';
import { HomeCompose } from './HomeCompose';
import { KickerNav } from './KickerNav';
import { PieceStage } from './PieceStage';
import { SiteFoot } from './SiteFoot';
import { StudioDesk } from './StudioDesk';

export function Studio({
  piece,
  error,
  askPay,
  email,
  known,
  owner = false,
}: {
  piece?: Piece;
  error?: string;
  askPay?: boolean;
  email?: string;
  known?: boolean;
  owner?: boolean;
}) {
  return (
    <main id="content" className={`page-main${piece ? '' : ' page-home'}`}>
      <KickerNav here="home" email={email} known={known} owner={owner} />
      {piece ? (
        <StudioDesk piece={piece} error={error} askPay={askPay} />
      ) : (
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title" className="home-hero-title">
            Turn a question into a publish-ready chart
          </h1>
          <DustRail className="home-hero-dust dust-rail is-idle" />
          <p className="home-hero-lede">
            AI drafts the series. You get a link and PNG. Add a source when you have one — it shows on
            the chart.
          </p>
          <HomeCompose error={error} askPay={askPay} />
          <AgentPaste />
        </section>
      )}
      <div id="examples" className={piece ? undefined : 'home-examples'}>
        <ExampleList skip={piece?.slug} home={!piece} />
      </div>
      <SiteFoot />
    </main>
  );
}

function ExampleList({ skip, home = false }: { skip?: string; home?: boolean }) {
  const pieces = PIECES.filter((piece) => piece.slug !== skip);
  if (pieces.length === 0) {
    return null;
  }

  return (
    <>
      <p className={home ? 'home-examples-kicker is-home' : 'home-examples-kicker'}>Examples</p>
      <div className="piece-list">
        {pieces.map((piece) => (
          <PieceStage
            key={piece.slug}
            piece={piece}
            titleId={`example-${piece.slug}`}
            href={`/c/${piece.slug}`}
          />
        ))}
      </div>
    </>
  );
}
