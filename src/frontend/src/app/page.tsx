'use client';

import { Box, Typography, Button, Stack } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: 2,
      }}
    >
      <Typography variant="h3" fontWeight={700}>
        Flayer
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Gestión de pedidos de impresión 3D
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          component={Link}
          href="/order-form"
          size="large"
        >
          Nuevo Pedido
        </Button>
        <Button
          variant="outlined"
          component={Link}
          href="/dashboard"
          size="large"
        >
          Dashboard
        </Button>
      </Stack>
    </Box>
  );
}
