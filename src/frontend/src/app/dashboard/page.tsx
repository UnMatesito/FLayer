'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Stack,
} from '@mui/material';
import ActiveOrdersTable from '@/components/ActiveOrdersTable';
import InternalOrderForm from '@/components/InternalOrderForm';

export default function DashboardPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Dashboard — Autenticación
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ingresa tu token JWT para acceder al dashboard.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="JWT Token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            <Button
              variant="contained"
              onClick={() => setToken(tokenInput.trim())}
              disabled={!tokenInput.trim()}
            >
              Acceder
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>
          Dashboard
        </Typography>
        <Button variant="text" onClick={() => setToken(null)}>
          Cerrar sesión
        </Button>
      </Box>

      <Stack spacing={4}>
        <Paper sx={{ p: 3 }}>
          <InternalOrderForm token={token} />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Pedidos Activos
          </Typography>
          <ActiveOrdersTable token={token} />
        </Paper>
      </Stack>
    </Container>
  );
}
