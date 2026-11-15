import type { GalleryChartModel } from '../../lib/gallery';
import { GalleryRemixLink, GalleryViewTrack } from './GalleryTrack';
import { SourceLine } from './SourceLine';

export function GalleryChartArticle({ model }: { model: GalleryChartModel }) {
  return (
    <article className="gallery-chart">
      <GalleryViewTrack />
      <p className="gallery-kicker">{model.topicLabel}</p>
      <h1 className="chart-title" id="chart-title">
        {model.title}
      </h1>
      <p className="gallery-dek">{model.description}</p>
      {model.imagePath ? (
        <figure className="gallery-plot">
          <img
            src={model.imagePath}
            alt={model.title}
            width={model.imageWidth}
            height={model.imageHeight}
            fetchPriority="high"
          />
        </figure>
      ) : (
        <p className="gallery-pending">The live series is unavailable right now. The source below is still the one this chart draws.</p>
      )}
      {model.updated ? (
        <p className="gallery-updated">
          <time dateTime={model.updated}>Updated {model.updated}</time>
        </p>
      ) : null}
      <SourceLine source={model.source} />
      <p className="gallery-actions">
        <GalleryRemixLink href={model.remixHref} />
      </p>
      {model.related.length > 0 ? (
        <section className="gallery-related" aria-labelledby="related-charts">
          <h2 id="related-charts">Related charts</h2>
          <ul>
            {model.related.map((item) => (
              <li key={item.slug}>
                <a href={`/charts/${item.slug}`}>{item.title}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(model.jsonLd) }} />
    </article>
  );
}
