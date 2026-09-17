import type { ReactNode } from 'react';

export function ChartFrame({
  children,
  className,
  head,
  foot,
}: {
  children: ReactNode;
  className?: string;
  head?: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className={['chart-frame', className].filter(Boolean).join(' ')}>
      {head ? <div className="chart-frame-head">{head}</div> : null}
      <div className="chart-frame-body">{children}</div>
      {foot ? <div className="chart-frame-foot">{foot}</div> : null}
    </div>
  );
}
