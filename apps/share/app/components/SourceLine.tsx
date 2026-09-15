import type { ChartSource } from '../../lib/source';
import { isInventedSource, sourceGrade, sourceHost } from '../../lib/source';

export function SourceLine({ source }: { source: ChartSource }) {
  const host = sourceHost(source.url);
  const grade = sourceGrade(source);

  return (
    <div className="source-block">
      <p className="source-kicker">Source</p>
      <p className="source-name">
        {source.label}
        <span className="source-grade">  ·  {grade}</span>
      </p>
      {host && source.url ? (
        <p className="source-link-row">
          <a className="source-ref" href={source.url} target="_blank" rel="noopener noreferrer">
            {host}
          </a>
        </p>
      ) : isInventedSource(source) ? (
        <p className="source-caveat">Not a live source</p>
      ) : null}
      {source.evidence ? <p className="source-evidence">{source.evidence}</p> : null}
    </div>
  );
}
