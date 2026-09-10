import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Overpass, Overpass_Mono } from 'next/font/google';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import './globals.css';
import Providers from './providers';

const overpass = Overpass({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-overpass',
  display: 'swap',
});

const overpassMono = Overpass_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-overpass-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Flayer',
  description: '3D printing order management',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" className={`${overpass.variable} ${overpassMono.variable}`} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
