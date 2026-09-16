import type { ConnectorId } from '../../lib/connectors/catalog';

export function ConnectorLogo({ id, size = 22 }: { id: ConnectorId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'sheets':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#34a853" strokeWidth="1.5" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="#34a853" strokeWidth="1.2" />
        </svg>
      );
    case 'wikipedia':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="#fff" stroke="#2b2b2b" strokeWidth="1.5" />
          <path
            d="M8 16c1.2-2.4 2-4.8 2.4-7.2h3.2c.4 2.4 1.2 4.8 2.4 7.2M10 8.8h4"
            fill="none"
            stroke="#2b2b2b"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'csv':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" fill="#fff" stroke="var(--ink)" strokeWidth="1.5" />
          <path d="M4 10h16M4 14h16M10 5v14" stroke="var(--ink)" strokeWidth="1.2" />
        </svg>
      );
    case 'stripe':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="3" fill="#635bff" />
          <path
            d="M12 9.5c-2.2 0-3.5 1.1-3.5 2.6 0 1.2 1 1.7 2.6 1.9 1.2.2 1.6.4 1.6 1 0 .6-.6 1-1.6 1-1.1 0-2-.4-2.6-1"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'notion':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#fff" stroke="#2b2b2b" strokeWidth="1.5" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="#2b2b2b" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'postgres':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="7" rx="7" ry="3.5" fill="#336791" />
          <path d="M5 7v8c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5V7" fill="#336791" />
          <ellipse cx="12" cy="15" rx="7" ry="3.5" fill="#336791" opacity="0.85" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="var(--rule)" />
        </svg>
      );
  }
}
