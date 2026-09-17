export function PinMark({ on = false }: { on?: boolean }) {
  return (
    <svg
      className={on ? 'pin-mark is-on' : 'pin-mark'}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <g className="pin-shade" transform="translate(1.05 1.1)">
        <ellipse cx="12" cy="10.2" rx="6.4" ry="2.35" />
        <path d="M11.4 10.2h1.2L12.7 20.2 12 21.1l-.7-.9z" />
      </g>
      <path className="pin-needle" d="M11.35 9.9h1.3L12.75 19.9 12 21.05 11.25 19.9z" />
      <ellipse className="pin-rim" cx="12" cy="10.15" rx="6.55" ry="2.45" />
      <path className="pin-side" d="M5.45 7.2v2.95a6.55 2.45 0 0 0 13.1 0V7.2" />
      <ellipse className="pin-dome" cx="12" cy="7.15" rx="6.55" ry="3.2" />
      <ellipse className="pin-glint" cx="9.55" cy="6.2" rx="2.15" ry="1.05" />
    </svg>
  );
}
