import type { ReactNode } from 'react';
import { DustRail } from './DustRail';

export function ChartFrame({
  children,
  className,
  head,
}: {
  children: ReactNode;
  className?: string;
  head?: ReactNode;
}) {
  return (
    <div className={['chart-frame', className].filter(Boolean).join(' ')}>
      <DustRail className="chart-frame-rail dust-rail" />
      {head ? <div className="chart-frame-head">{head}</div> : null}
      <div className="chart-frame-body">{children}</div>
    </div>
  );
}
