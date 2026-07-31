'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container, Typography, Button, Box, Paper, Stack, Chip,
  CircularProgress, Alert, Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { SxProps, Theme } from '@mui/material';
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
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        </Container>
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error instanceof Error ? error.message : 'Order not found'}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} sx={{ mt: 2 }}>Volver al Dashboard</Button>
        </Container>
      </ProtectedRoute>
    );
  }

  const actions = getStatusActions(order.work_type)[order.status] || [];
  const isMutationPending = statusMutation.isPending;

  return (
    <ProtectedRoute>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} sx={{ mb: 2 }}>
          Volver al Dashboard
        </Button>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={600}>Pedido</Typography>
            <Chip label={statusLabel(order.status)} color={statusColor(order.status) as any} size="medium" />
          </Box>

          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: 180 }}>ID</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{order.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell>{order.customer_name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell>{order.customer_email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Tipo de Trabajo</TableCell>
                <TableCell>{workTypeLabel(order.work_type)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{order.description}</TableCell>
              </TableRow>
              {!isProduct && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Filamento</TableCell>
                  <TableCell>
                    {order.filament_id ? (
                      <Chip label={`Filamento asignado (${order.grams_estimated ?? '?'}g estimados)`} size="small" color="info" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">No asignado</Typography>
                    )}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Fecha de Creación</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
              {order.files && order.files.length > 0 && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Archivos</TableCell>
                  <TableCell>
                    {order.files.map((f, i) => (
                      <Typography key={i} variant="body2">{f.filename}: {f.url}</Typography>
                    ))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {actions.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>Acciones</Typography>
            <Stack direction="row" spacing={2}>
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
            </Stack>
            {statusMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {statusMutation.error instanceof Error ? statusMutation.error.message : 'Error al actualizar el estado'}
              </Alert>
            )}
          </Paper>
        )}

        {!isProduct && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>Presupuesto</Typography>
              {budget && order.status === 'quoting' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setBudgetFormOpen(true)}
                >
                  Editar Presupuesto
                </Button>
              )}
            </Box>

            {budgetLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : budget ? (
              <BudgetBreakdown budget={budget} orderId={id} />
            ) : order.status === 'quoting' ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  No hay presupuesto para este pedido.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setBudgetFormOpen(true)}
                >
                  Generar Presupuesto
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="text.secondary">
                  No hay presupuesto para este pedido.
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Container>

      <BudgetForm
        open={budgetFormOpen}
        onClose={() => setBudgetFormOpen(false)}
        orderId={id}
        existingBudget={budget ?? null}
      />
    </ProtectedRoute>
  );
}
