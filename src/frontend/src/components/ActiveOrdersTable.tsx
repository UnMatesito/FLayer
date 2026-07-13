'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Box,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveOrders, type Order } from '@/app/api';

interface Props {
  token: string;
}

function statusColor(status: string) {
  switch (status) {
    case 'new':
      return 'info';
    case 'in_progress':
      return 'warning';
    case 'ready':
      return 'success';
    case 'delivered':
      return 'success';
    default:
      return 'default';
  }
}

export default function ActiveOrdersTable({ token }: Props) {
  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ['active-orders'],
    queryFn: () => fetchActiveOrders(token),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error">
        Error al cargar pedidos:{' '}
        {error instanceof Error ? error.message : 'Error desconocido'}
      </Typography>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        No hay pedidos activos.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Fecha</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {order.id.slice(0, 8)}...
              </TableCell>
              <TableCell>{order.customer_id}</TableCell>
              <TableCell>
                {order.work_type === 'impresion_3d'
                  ? 'Impresión 3D'
                  : 'Diseño 3D'}
              </TableCell>
              <TableCell>
                <Chip
                  label={order.status}
                  color={statusColor(order.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(order.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
