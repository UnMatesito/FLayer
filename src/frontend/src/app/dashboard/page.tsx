'use client';

import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
} from '@mui/material';
import OrdersTable from '@/components/OrdersTable';
import InternalOrderForm from '@/components/InternalOrderForm';
import ProtectedRoute from '../protected-route';
import { useAuth } from '../auth-context';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Dashboard
            </Typography>
            {user && (
              <Typography variant="body2" color="text.secondary">
                {user.name} — {user.email}
              </Typography>
            )}
          </Box>
          <Button variant="text" onClick={logout}>
            Cerrar sesión
          </Button>
        </Box>

        <Stack spacing={4}>
          <Paper sx={{ p: 3 }}>
            <InternalOrderForm />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Pedidos
            </Typography>
            <OrdersTable />
          </Paper>
        </Stack>
      </Container>
    </ProtectedRoute>
  );
}
