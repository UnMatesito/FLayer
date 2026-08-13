'use client';

import { useResolvedColorScheme } from '@/app/theme';

export function FlayerLogo({ size = 24 }: { size?: number }) {
  const scheme = useResolvedColorScheme();
  const src = scheme === 'dark' ? '/iso_white.svg' : '/iso_black.svg';

  return (
    <img
      src={src}
      alt="Flayer"
      height={size}
      style={{ height: size, width: 'auto', objectFit: 'contain' }}
    />
  );
}