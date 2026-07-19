'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Select,
  MenuItem,
  CircularProgress,
  Box,
  IconButton,
  Button,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllOrders, updateOrderStatus, fetchBudget, type Order, type BudgetResponse } from '@/app/api';

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['quoting', 'cancelled'],
  quoting: ['printing', 'cancelled'],
  printing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function statusColor(status: string) {
  switch (status) {
    case 'new':
      return 'info';
    case 'quoting':
      return 'warning';
    case 'printing':
      return 'info';
    case 'ready':
      return 'success';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'new':
      return 'Nuevo';
    case 'quoting':
      return 'Presupuestando';
    case 'printing':
      return 'Imprimiendo';
    case 'ready':
      return 'Listo';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

interface StatusCellProps {
  order: Order;
}

function BudgetCell({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const router = useRouter();
  const { data: budget, isLoading } = useQuery<BudgetResponse>({
    queryKey: ['budget', orderId],
    queryFn: () => fetchBudget(orderId),
    retry: false,
    staleTime: 30_000,
  });

  if (orderStatus !== 'quoting') {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }

  if (isLoading) {
    return <CircularProgress size={14} />;
  }

  if (!budget) {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/orders/${orderId}`);
        }}
      >
        Presupuestar
      </Button>
    );
  }

  return <Chip label="Presupuestado" color="success" size="small" />;
}

function StatusCell({ order }: StatusCellProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(order.status);

  const mutation = useMutation({
    mutationFn: (newStatus: string) => updateOrderStatus(order.id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      setEditing(false);
    },
  });

  const transitions = VALID_TRANSITIONS[order.status] || [];

  if (transitions.length === 0) {
    return (
      <Chip
        label={statusLabel(order.status)}
        color={statusColor(order.status) as any}
        size="small"
      />
    );
  }

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          size="small"
          sx={{ minWidth: 130, fontSize: '0.8rem' }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        >
          {transitions.map((s) => (
            <MenuItem key={s} value={s}>
              {statusLabel(s)}
            </MenuItem>
          ))}
        </Select>
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            mutation.mutate(selected);
          }}
          disabled={mutation.isPending || selected === order.status}
        >
          {mutation.isPending ? (
            <CircularProgress size={14} />
          ) : (
            <CheckIcon fontSize="small" />
          )}
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(order.status);
            setEditing(false);
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      sx={{ cursor: 'pointer' }}
    >
      <Chip
        label={statusLabel(order.status)}
        color={statusColor(order.status) as any}
        size="small"
      />
    </Box>
  );
}

export default function OrdersTable() {
  const router = useRouter();
  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => fetchAllOrders(),
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
        No hay pedidos.
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
            <TableCell>Presupuesto</TableCell>
            <TableCell>Fecha</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              hover
              onClick={() => router.push(`/dashboard/orders/${order.id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {order.id.slice(0, 8)}...
              </TableCell>
              <TableCell>{order.customer_id}</TableCell>
              <TableCell>
                {order.work_type === 'impresion_3d'
                  ? 'Impresión 3D'
                  : 'Diseño 3D'}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <StatusCell order={order} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <BudgetCell orderId={order.id} orderStatus={order.status} />
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
