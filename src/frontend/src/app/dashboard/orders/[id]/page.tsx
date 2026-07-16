'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/app/protected-route';
import {
  fetchOrderDetail,
  updateOrderStatus,
  type OrderDetail,
} from '@/app/api';

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
    case 'in_progress':
      return 'En Progreso';
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

function workTypeLabel(workType: string) {
  switch (workType) {
    case 'impresion_3d':
      return 'Impresión 3D';
    case 'diseno_3d':
      return 'Diseño 3D';
    default:
      return workType;
  }
}

interface Action {
  label: string;
  targetStatus: string;
  color: 'primary' | 'error' | 'success';
}

const STATUS_ACTIONS: Record<string, Action[]> = {
  new: [
    { label: 'Iniciar', targetStatus: 'in_progress', color: 'primary' },
    { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
  ],
  in_progress: [
    { label: 'Marcar como Listo', targetStatus: 'ready', color: 'success' },
    { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
  ],
  ready: [
    { label: 'Marcar como Entregado', targetStatus: 'delivered', color: 'success' },
    { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
  ],
  delivered: [],
  cancelled: [],
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateOrderStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Order not found'}
          </Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} sx={{ mt: 2 }}>
            Volver al Dashboard
          </Button>
        </Container>
      </ProtectedRoute>
    );
  }

  const actions = STATUS_ACTIONS[order.status] || [];
  const isMutationPending = statusMutation.isPending;

  return (
    <ProtectedRoute>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard')}
          sx={{ mb: 2 }}
        >
          Volver al Dashboard
        </Button>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={600}>
              Pedido
            </Typography>
            <Chip
              label={statusLabel(order.status)}
              color={statusColor(order.status) as any}
              size="medium"
            />
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
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Fecha de Creación</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
              {order.files && order.files.length > 0 && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Archivos</TableCell>
                  <TableCell>
                    {order.files.map((f, i) => (
                      <Typography key={i} variant="body2">
                        {f.filename}: {f.url}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {actions.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Acciones
            </Typography>
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
                {statusMutation.error instanceof Error
                  ? statusMutation.error.message
                  : 'Error al actualizar el estado'}
              </Alert>
            )}
          </Paper>
        )}
      </Container>
    </ProtectedRoute>
  );
}
