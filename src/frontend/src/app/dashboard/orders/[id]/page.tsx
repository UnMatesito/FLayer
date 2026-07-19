'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container, Typography, Button, Box, Paper, Stack, Chip,
  CircularProgress, Alert, Table, TableBody, TableCell, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/app/protected-route';
import {
  fetchOrderDetail, updateOrderStatus, fetchFilaments, fetchBudget,
  type OrderDetail, type Filament, type BudgetResponse,
} from '@/app/api';
import { FilamentIcon } from '@/components/FilamentIcon';
import BudgetForm from '@/components/BudgetForm';
import BudgetBreakdown from '@/components/BudgetBreakdown';

const styles: Record<string, SxProps<Theme>> = {
  filamentInfo: {
    display: 'flex', alignItems: 'center', gap: 1,
  },
};

function statusColor(status: string) {
  switch (status) {
    case 'new': return 'info';
    case 'quoting': return 'warning';
    case 'printing': return 'info';
    case 'ready': return 'success';
    case 'delivered': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'new': return 'Nuevo';
    case 'quoting': return 'Presupuestando';
    case 'printing': return 'Imprimiendo';
    case 'ready': return 'Listo';
    case 'delivered': return 'Entregado';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
}

function workTypeLabel(workType: string) {
  switch (workType) {
    case 'impresion_3d': return 'Impresión 3D';
    case 'diseno_3d': return 'Diseño 3D';
    default: return workType;
  }
}

interface Action {
  label: string;
  targetStatus: string;
  color: 'primary' | 'error' | 'success';
}

const STATUS_ACTIONS: Record<string, Action[]> = {
  new: [
    { label: 'Presupuestar', targetStatus: 'quoting', color: 'primary' },
    { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
  ],
  quoting: [
    { label: 'Iniciar impresión', targetStatus: 'printing', color: 'primary' },
    { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
  ],
  printing: [
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

function ReadyDialog({
  open, onClose, filaments, orderId,
}: {
  open: boolean; onClose: () => void; filaments: Filament[]; orderId: string;
}) {
  const queryClient = useQueryClient();
  const [filamentId, setFilamentId] = useState('');
  const [grams, setGrams] = useState('');
  const [showLowStockWarning, setShowLowStockWarning] = useState(false);

  const selectedFilament = filaments.find((f) => f.id === filamentId);
  const gramsNum = Number(grams);

  const mutation = useMutation({
    mutationFn: () => updateOrderStatus(orderId, 'printing', filamentId || undefined, gramsNum || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['filament', filamentId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      onClose();
    },
  });

  const handleConfirm = () => {
    if (selectedFilament && gramsNum > 0 && gramsNum > selectedFilament.weight_grams) {
      setShowLowStockWarning(true);
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Iniciar impresión</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Filamento</InputLabel>
              <Select value={filamentId} label="Filamento" onChange={(e) => setFilamentId(e.target.value)}>
                {filaments.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    <Box sx={styles.filamentInfo}>
                      <FilamentIcon color={f.color_hex} size={16} />
                      {f.color_name} — {f.filament_type} ({f.weight_grams.toFixed(0)}g disp.)
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Gramos estimados"
              type="number"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              fullWidth
              required
              helperText="Peso estimado del filamento usado en este pedido"
            />
            {selectedFilament && gramsNum > 0 && gramsNum > selectedFilament.weight_grams && (
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                Este pedido requiere {gramsNum}g pero solo hay {selectedFilament.weight_grams.toFixed(1)}g disponibles.
                Se permitirá el descuento igualmente (stock negativo).
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} variant="contained" color="success"
            disabled={!filamentId || !grams || mutation.isPending}>
            {mutation.isPending ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showLowStockWarning} onClose={() => setShowLowStockWarning(false)} maxWidth="xs">
        <DialogTitle>Stock Insuficiente</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Stock insuficiente para {selectedFilament?.color_name}: requiere {gramsNum}g, disponible {selectedFilament?.weight_grams.toFixed(1)}g.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            ¿Deseas continuar igualmente? El stock quedará en negativo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLowStockWarning(false)}>Cancelar</Button>
          <Button onClick={() => { setShowLowStockWarning(false); mutation.mutate(); }} variant="contained" color="warning">
            Continuar de todos modos
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [readyDialog, setReadyDialog] = useState(false);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
  });

  const { data: filaments } = useQuery<Filament[]>({
    queryKey: ['filaments-ready'],
    queryFn: () => fetchFilaments(),
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

  const actions = STATUS_ACTIONS[order.status] || [];
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
                  onClick={() => {
                    if (action.targetStatus === 'printing') {
                      setReadyDialog(true);
                    } else if (action.targetStatus === 'quoting') {
                      statusMutation.mutate('quoting');
                    } else {
                      statusMutation.mutate(action.targetStatus);
                    }
                  }}
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
      </Container>

      {readyDialog && filaments && (
        <ReadyDialog open={readyDialog} onClose={() => setReadyDialog(false)} filaments={filaments} orderId={id} />
      )}

      <BudgetForm
        open={budgetFormOpen}
        onClose={() => setBudgetFormOpen(false)}
        orderId={id}
        existingBudget={budget ?? null}
      />
    </ProtectedRoute>
  );
}
