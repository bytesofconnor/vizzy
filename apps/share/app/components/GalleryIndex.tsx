import { galleryChartsByTopic } from '../../lib/gallery';

export function GalleryIndex() {
  const topics = galleryChartsByTopic();
  return (
    <article className="gallery-index">
      <h1 className="chart-title" id="gallery-title">
        Gallery
      </h1>
      <p className="gallery-dek">
        Public charts of the economy, climate, energy, demographics, and markets. Each one cites a published series.
      </p>
      {topics.map((topic) => (
        <section key={topic.id} className="gallery-topic" aria-labelledby={`topic-${topic.id}`}>
          <h2 id={`topic-${topic.id}`}>{topic.label}</h2>
          <ul className="gallery-index-list">
            {topic.charts.map((chart) => (
              <li key={chart.slug}>
                <a href={`/charts/${chart.slug}`}>{chart.title}</a>
                <p>{chart.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
