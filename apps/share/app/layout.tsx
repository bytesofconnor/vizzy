import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vizzy-ruddy.vercel.app'),
  title: 'Vizzy',
  description: 'A chart you can paste.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${mono.variable}`}
        style={{
          minHeight: '100vh',
          fontFamily: 'var(--font-sans), Helvetica, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
