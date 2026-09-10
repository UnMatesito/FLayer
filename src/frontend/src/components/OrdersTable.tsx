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
  TextField,
  FormControl,
  InputLabel,
  type SxProps,
  type Theme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllOrders, updateOrderStatus, type Order } from '@/app/api';
import { getStatusTransitions, statusColor, statusLabel } from '@/utils/order';
import Pagination, { usePagination } from '@/components/Pagination';
import { useDashboardFeedback } from '@/app/dashboard/feedback';
import { normalizeApiError } from '@/app/error-normalizer';

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
  const feedback = useDashboardFeedback();
  const [editing, setEditing] = useState(false);
  const availableTransitions = transitions[order.status] || [];
  const [selected, setSelected] = useState(availableTransitions[0] || '');

  const mutation = useMutation({
    mutationFn: (newStatus: string) => updateOrderStatus(order.id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      setEditing(false);
      feedback.success('Estado actualizado');
    },
    onError: (err: unknown) => feedback.error(normalizeApiError(err, 'No se pudo actualizar el estado')),
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
      title="Cambiar estado"
    >
      <Chip
        label={statusLabel(order.status)}
        color={statusColor(order.status) as any}
        size="small"
      />
    </div>
  );
}

const headCellSx: SxProps<Theme> = {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'text.secondary',
    whiteSpace: 'nowrap',
  };

export default function OrdersTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => fetchAllOrders(),
    refetchInterval: 30_000,
  });
  const filteredOrders = (orders ?? [])
    .filter((order) => `${order.id} ${order.customer_name ?? ''} ${order.description}`.toLowerCase().includes(search.toLowerCase()))
    .filter((order) => !statusFilter || order.status === statusFilter)
    .filter((order) => !typeFilter || order.work_type === typeFilter);
  const pagination = usePagination(filteredOrders.length, 10);
  const quotingCount = filteredOrders.filter((o) => o.status === 'quoting').length;
  const statuses = Array.from(new Set((orders ?? []).map((order) => order.status)));

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    pagination.setPage(0);
  };

  return (
    <div className="card h-full rounded-md border border-line bg-snow">
      <div className="flex flex-wrap items-baseline justify-between gap-1 border-b border-line px-4 py-3">
        <h3 className="text-[1.05rem] font-semibold">Pedidos</h3>
        {!isLoading && !error && orders && (
          <p className="text-[0.8rem] text-slate">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'} · {quotingCount} en cotización
          </p>
        )}
      </div>
      {!isLoading && !error && orders && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <TextField size="small" label="Buscar pedido" value={search} onChange={(e) => { setSearch(e.target.value); pagination.setPage(0); }} sx={{ minWidth: { xs: '100%', sm: 220 } }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={statusFilter} label="Estado" onChange={(e) => { setStatusFilter(e.target.value); pagination.setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {statuses.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={typeFilter} label="Tipo" onChange={(e) => { setTypeFilter(e.target.value); pagination.setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="impresion_3d">Impresión 3D</MenuItem>
              <MenuItem value="diseno_3d">Diseño 3D</MenuItem>
              <MenuItem value="product">Producto</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" onClick={resetFilters}>Limpiar filtros</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-6">
          <CircularProgress />
        </div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-error">
          Error al cargar pedidos:{' '}
          {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
          <p className="text-[0.95rem] font-semibold">No hay pedidos todavía</p>
          <p className="max-w-[24rem] text-[0.82rem] text-slate">
            Crea el primero con el formulario de pedido interno o compartiendo tu link
            de clientes.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
          <p className="text-[0.95rem] font-semibold">Pedidos no tiene resultados con los filtros activos</p>
          <Button size="small" onClick={resetFilters}>Limpiar filtros</Button>
        </div>
      ) : (
        <>
          <TableContainer className="px-2">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx}>Pedido</TableCell>
                  <TableCell sx={headCellSx}>Cliente</TableCell>
                  <TableCell sx={headCellSx}>Tipo</TableCell>
                  <TableCell sx={headCellSx}>Estado</TableCell>
                  <TableCell sx={headCellSx}>Presupuesto</TableCell>
                  <TableCell sx={headCellSx}>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagination.slice(filteredOrders).map((order) => (
                  <TableRow
                    key={order.id}
                    hover
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-mono text-[0.8rem]">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customer_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          order.work_type === 'impresion_3d'
                            ? 'Impresión 3D'
                            : order.work_type === 'product'
                            ? 'Producto'
                            : 'Diseño 3D'
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <StatusCell order={order} transitions={getStatusTransitions(order.work_type)} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <BudgetCell orderId={order.id} orderStatus={order.status} workType={order.work_type} hasBudget={order.has_budget ?? false} />
                    </TableCell>
                    <TableCell className="text-[0.8rem] text-slate">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            count={filteredOrders.length}
            page={pagination.page}
            onPageChange={pagination.setPage}
            rowsPerPage={pagination.rowsPerPage}
            onRowsPerPageChange={pagination.onRowsPerPageChange}
          />
        </>
      )}
    </div>
  );
}
