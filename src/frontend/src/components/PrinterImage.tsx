'use client';

import { useEffect, useState } from 'react';
import { PrinterIcon } from '@/components/PrinterIcon';

export function PrinterImage({
  src,
  alt,
  className = '',
  iconSize = 60,
}: {
  src: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-canvas text-slate ${className}`}>
        <PrinterIcon color="currentColor" size={iconSize} />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="block h-full w-full object-cover"
      />
    </div>
  );
}
