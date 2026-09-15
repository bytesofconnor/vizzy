import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { PwaBoot } from './components/PwaBoot';
import { STUDIO } from '../lib/theme';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vizzy.run';
const description = 'A chart you can paste. Literally anything. We pull the data, chart it fast, and you paste it anywhere.';

export const viewport: Viewport = {
  themeColor: STUDIO.paper,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: 'Vizzy',
    template: '%s · Vizzy',
  },
  description,
  applicationName: 'Vizzy',
  category: 'productivity',
  appleWebApp: {
    capable: true,
    title: 'Vizzy',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Vizzy',
    title: 'Vizzy',
    description: 'A chart you can paste.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vizzy',
    description: 'A chart you can paste.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${mono.variable}`}
        style={{
          minHeight: '100dvh',
          fontFamily: 'var(--font-sans), Helvetica, sans-serif',
        }}
      >
        <PwaBoot />
        {children}
      </body>
    </html>
  );
}
