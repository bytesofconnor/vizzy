export function ShareMark({ on = false }: { on?: boolean }) {
  return (
    <svg
      className={on ? 'pin-mark is-on' : 'pin-mark'}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <g className="pin-shade" transform="translate(1.05 1.1)">
        <path d="M11.2 7.6h1.55L7.05 16.05H5.55z" />
        <path d="M11.25 7.6h1.55l4.7 8.45h-1.5z" />
        <ellipse cx="6.15" cy="16.35" rx="2.55" ry="2.2" />
        <ellipse cx="12" cy="6.35" rx="2.55" ry="2.2" />
        <ellipse cx="17.85" cy="16.35" rx="2.55" ry="2.2" />
      </g>
      <path className="pin-needle" d="M11.15 6.55h1.7L7 15.55H5.45z" />
      <path className="pin-needle" d="M11.15 6.55h1.7L19 15.55h-1.55z" />
      <ellipse className="pin-rim" cx="6.15" cy="16.2" rx="2.7" ry="2.35" />
      <ellipse className="pin-dome" cx="6.15" cy="15.35" rx="2.7" ry="2.05" />
      <ellipse className="pin-glint" cx="5.3" cy="14.75" rx="1.05" ry="0.7" />
      <ellipse className="pin-rim" cx="12" cy="6.25" rx="2.7" ry="2.35" />
      <ellipse className="pin-dome" cx="12" cy="5.4" rx="2.7" ry="2.05" />
      <ellipse className="pin-glint" cx="11.15" cy="4.8" rx="1.05" ry="0.7" />
      <ellipse className="pin-rim" cx="17.85" cy="16.2" rx="2.7" ry="2.35" />
      <ellipse className="pin-dome" cx="17.85" cy="15.35" rx="2.7" ry="2.05" />
      <ellipse className="pin-glint" cx="17" cy="14.75" rx="1.05" ry="0.7" />
    </svg>
  );
}

export function ExportMark({ on = false }: { on?: boolean }) {
  return (
    <svg
      className={on ? 'pin-mark is-on' : 'pin-mark'}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <g className="pin-shade" transform="translate(1.05 1.1)">
        <path d="M11.15 4.4h1.7v8.2h-1.7z" />
        <path d="M7.4 10.1 12 15.1l4.6-5" />
        <path d="M5.2 16.4h13.6v3.3H5.2z" />
      </g>
      <path className="pin-needle" d="M11.2 3.35h1.6v8.35h-1.6z" />
      <path className="pin-needle" d="M7.15 9.55h2.05L12 13.2l2.8-3.65h2.05L12 15.05z" />
      <path className="pin-side" d="M4.35 15.55h15.3v2.55l-1.15 1.55H5.5L4.35 18.1z" />
      <path className="pin-rim" d="M4.35 15.55h15.3v1.35H4.35z" />
      <path className="pin-dome" d="M5.35 14.85h13.3l.95.7H4.4z" />
      <ellipse className="pin-glint" cx="8.2" cy="15.15" rx="1.6" ry="0.45" />
    </svg>
  );
}

export function RemixMark({ on = false }: { on?: boolean }) {
  return (
    <svg
      className={on ? 'pin-mark is-on' : 'pin-mark'}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <g className="pin-shade" transform="translate(1.05 1.1)">
        <rect x="4.4" y="6.4" width="11.2" height="8.4" rx="1.6" />
        <rect x="8.6" y="9.4" width="11.2" height="8.4" rx="1.6" />
      </g>
      <rect className="pin-rim" x="3.4" y="5.35" width="11.4" height="8.5" rx="1.7" />
      <rect className="pin-dome" x="3.4" y="5.35" width="11.4" height="3.1" rx="1.4" />
      <rect className="pin-side" x="7.6" y="8.45" width="11.4" height="8.5" rx="1.7" />
      <rect className="pin-dome" x="7.6" y="8.45" width="11.4" height="3.1" rx="1.4" />
      <ellipse className="pin-glint" cx="10.2" cy="9.7" rx="1.7" ry="0.7" />
    </svg>
  );
}
