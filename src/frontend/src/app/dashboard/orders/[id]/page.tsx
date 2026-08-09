'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, Alert, Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/app/protected-route';
import {
  fetchOrderDetail, updateOrderStatus, fetchBudget,
  type OrderDetail, type BudgetResponse,
} from '@/app/api';
import BudgetForm from '@/components/BudgetForm';
import BudgetBreakdown from '@/components/BudgetBreakdown';
import { statusColor, statusLabel, workTypeLabel, getStatusActions } from '@/utils/order';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
  });

  const {
    data: budget,
    isLoading: budgetLoading,
  } = useQuery<BudgetResponse>({
    queryKey: ['budget', id],
    queryFn: () => fetchBudget(id),
    enabled: !!id,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateOrderStatus(id, newStatus),
    onSuccess: (_data, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (newStatus === 'quoting') {
        setBudgetFormOpen(true);
      }
    },
  });

  const isProduct = order?.work_type === 'product';

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="mx-auto w-full max-w-4xl px-3 py-4">
          <div className="flex justify-center p-4"><CircularProgress /></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <div className="mx-auto w-full max-w-4xl px-3 py-4">
          <Alert severity="error">{error instanceof Error ? error.message : 'Order not found'}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} sx={{ mt: 2 }}>Volver al dashboard</Button>
        </div>
      </ProtectedRoute>
    );
  }

  const actions = getStatusActions(order.work_type)[order.status] || [];
  const isMutationPending = statusMutation.isPending;

  return (
    <ProtectedRoute>
      <div className="mx-auto w-full max-w-4xl px-3 py-4">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} sx={{ mb: 2 }}>
          Volver al dashboard
        </Button>

        <div className="mb-3 card rounded-md border border-line bg-snow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[1.5rem] font-semibold">Pedido</h2>
            <Chip label={statusLabel(order.status)} color={statusColor(order.status) as any} size="medium" />
          </div>

          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell className="w-[180px] font-semibold">ID</TableCell>
                <TableCell className="font-mono">{order.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Cliente</TableCell>
                <TableCell>{order.customer_name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Email</TableCell>
                <TableCell>{order.customer_email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Tipo de Trabajo</TableCell>
                <TableCell>{workTypeLabel(order.work_type)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Descripción</TableCell>
                <TableCell className="whitespace-pre-wrap">{order.description}</TableCell>
              </TableRow>
              {!isProduct && (
                <TableRow>
                  <TableCell className="font-semibold">Filamento</TableCell>
                  <TableCell>
                    {order.filament_id ? (
                      <Chip label={`Filamento asignado (${order.grams_estimated ?? '?'}g estimados)`} size="small" color="info" variant="outlined" />
                    ) : (
                      <p className="text-sm text-slate">No asignado</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-semibold">Fecha de Creación</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
              {order.files && order.files.length > 0 && (
                <TableRow>
                  <TableCell className="font-semibold">Archivos</TableCell>
                  <TableCell>
                    {order.files.map((f, i) => (
                      <p key={i} className="text-sm text-slate">{f.filename}: {f.url}</p>
                    ))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {actions.length > 0 && (
          <div className="card rounded-md border border-line bg-snow p-4">
            <h3 className="mb-2 text-[1.25rem] font-semibold">Acciones</h3>
            <div className="flex gap-2">
              {actions.map((action) => (
                <Button
                  key={action.targetStatus}
                  variant="contained"
                  color={action.color}
                  onClick={() => statusMutation.mutate(action.targetStatus)}
                  disabled={isMutationPending}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            {statusMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {statusMutation.error instanceof Error ? statusMutation.error.message : 'Error al actualizar el estado'}
              </Alert>
            )}
          </div>
        )}

        {!isProduct && (
          <div className="mt-3 card rounded-md border border-line bg-snow p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[1.25rem] font-semibold">Presupuesto</h3>
              {budget && order.status === 'quoting' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setBudgetFormOpen(true)}
                >
                  Editar presupuesto
                </Button>
              )}
            </div>

            {budgetLoading ? (
              <div className="flex justify-center p-4">
                <CircularProgress size={24} />
              </div>
            ) : budget ? (
              <BudgetBreakdown budget={budget} orderId={id} />
            ) : order.status === 'quoting' ? (
              <div className="flex flex-col items-start gap-1.5 py-1">
                <p className="text-sm text-slate">
                  No hay presupuesto para este pedido.
                </p>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setBudgetFormOpen(true)}
                >
                  Generar presupuesto
                </Button>
              </div>
            ) : (
              <p className="py-1 text-sm text-slate">
                No hay presupuesto para este pedido.
              </p>
            )}
          </div>
        )}
      </div>

      <BudgetForm
        open={budgetFormOpen}
        onClose={() => setBudgetFormOpen(false)}
        orderId={id}
        existingBudget={budget ?? null}
      />
    </ProtectedRoute>
  );
}
