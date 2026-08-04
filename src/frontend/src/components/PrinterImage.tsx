'use client';

import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { PrinterIcon } from '@/components/PrinterIcon';

export function PrinterImage({
  src,
  alt,
  sx,
  iconSize = 60,
}: {
  src: string | null;
  alt: string;
  sx?: SxProps<Theme>;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          ...sx,
        }}
      >
        <PrinterIcon color="#9e9e9e" size={iconSize} />
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'hidden', ...sx }}>
      <Box
        component="img"
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
}
