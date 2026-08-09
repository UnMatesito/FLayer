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
  Chip,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Button,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllOrders, updateOrderStatus, type Order } from '@/app/api';
import { getStatusTransitions, statusColor, statusLabel } from '@/utils/order';

interface StatusCellProps {
  order: Order;
  transitions: Record<string, string[]>;
}

function BudgetCell({ orderId, orderStatus, workType, hasBudget }: { orderId: string; orderStatus: string; workType: string; hasBudget: boolean }) {
  const router = useRouter();

  if (workType === 'product') {
    return <span className="text-sm text-slate">—</span>;
  }

  if (orderStatus !== 'quoting') {
    return <span className="text-sm text-slate">—</span>;
  }

  if (hasBudget) {
    return <Chip label="Presupuestado" color="success" size="small" />;
  }

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

function StatusCell({ order, transitions }: StatusCellProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const availableTransitions = transitions[order.status] || [];
  const [selected, setSelected] = useState(availableTransitions[0] || '');

  const mutation = useMutation({
    mutationFn: (newStatus: string) => updateOrderStatus(order.id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      setEditing(false);
    },
  });

  if (availableTransitions.length === 0) {
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
      <div className="flex items-center gap-0.5">
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          size="small"
          sx={{ minWidth: 130, fontSize: '0.8rem' }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        >
          {availableTransitions.map((s) => (
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
          disabled={mutation.isPending || !selected || selected === order.status}
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
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className="cursor-pointer"
    >
      <Chip
        label={statusLabel(order.status)}
        color={statusColor(order.status) as any}
        size="small"
      />
    </div>
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
      <div className="flex justify-center p-4">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error">
        Error al cargar pedidos:{' '}
        {error instanceof Error ? error.message : 'Error desconocido'}
      </p>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <p className="py-4 text-sm text-slate">
        No hay pedidos.
      </p>
    );
  }

  return (
    <div className="card rounded-md border border-line bg-snow">
      <TableContainer>
        <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pedido</TableCell>
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
                  <TableCell className="font-mono text-[0.8rem]">
                    #{order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {order.customer_name ?? '—'}
                  </TableCell>
              <TableCell>
                {order.work_type === 'impresion_3d'
                  ? 'Impresión 3D'
                  : order.work_type === 'product'
                  ? 'Producto'
                  : 'Diseño 3D'}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <StatusCell order={order} transitions={getStatusTransitions(order.work_type)} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <BudgetCell orderId={order.id} orderStatus={order.status} workType={order.work_type} hasBudget={order.has_budget ?? false} />
              </TableCell>
              <TableCell>
                {new Date(order.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
}
