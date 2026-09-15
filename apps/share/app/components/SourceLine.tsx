import type { ChartSource } from '../../lib/source';
import { isInventedSource, sourceGrade, sourceHost } from '../../lib/source';

export function SourceLine({ source }: { source: ChartSource }) {
  const host = sourceHost(source.url);
  const grade = sourceGrade(source);
  const invented = isInventedSource(source);

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
      ) : invented ? (
        <p className="source-caveat">No published page backs these numbers.</p>
      ) : !source.evidence ? (
        <p className="source-caveat">No source URL on this chart.</p>
      ) : null}
      {source.evidence ? (
        <p className="source-evidence">
          {invented ? <span className="source-basis-label">Basis · </span> : null}
          {source.evidence}
        </p>
      ) : null}
    </div>
  );
}
