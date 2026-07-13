import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Flayer',
  description: '3D printing order management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
