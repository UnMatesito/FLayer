'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, Chip, CircularProgress,
  Alert, Stack, Divider, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, MenuItem, Select,
  InputLabel, FormControl,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPrinter, deletePrinter, fetchPrinterMaintenance, createPrinterMaintenance,
  type Printer, type MaintenanceRecord, type MaintenanceType,
} from '@/app/api';
import { PrinterFormDialog } from '@/components/PrinterFormDialog';
import { PrinterImage } from '@/components/PrinterImage';

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'calibration', label: 'Calibración' },
  { value: 'cleaning', label: 'Limpieza' },
  { value: 'repair', label: 'Reparación' },
];

const styles: Record<string, SxProps<Theme>> = {
  fieldLabel: {
    color: 'text.secondary', fontSize: '0.8rem', mb: 0.5,
  },
  fieldValue: {
    fontWeight: 500,
  },
  headerImage: {
    width: 200,
    height: 200,
    borderRadius: 2,
    flexShrink: 0,
  },
};

function maintenanceColor(type: string) {
  switch (type) {
    case 'calibration': return 'info' as const;
    case 'cleaning': return 'success' as const;
    case 'repair': return 'warning' as const;
    default: return 'default' as const;
  }
}

function maintenanceLabel(type: string) {
  return MAINTENANCE_TYPES.find((t) => t.value === type)?.label ?? type;
}

function AddMaintenanceDialog({ open, onClose, printerId }: {
  open: boolean; onClose: () => void; printerId: string;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<MaintenanceType>('calibration');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createPrinterMaintenance(printerId, {
      maintenance_type: type,
      maintenance_date: date,
      description: description.trim(),
      cost: cost === '' ? null : Number(cost),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer-maintenance', printerId] });
      onClose();
      setDescription('');
      setCost('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Agregar mantenimiento</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth required multiline rows={2}
          />
          <TextField
            label="Costo (opcional)"
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => mutation.mutate()}
          variant="contained"
          disabled={!date || !description.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

export default function PrinterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  const { data: printer, isLoading, error } = useQuery<Printer>({
    queryKey: ['printer', id],
    queryFn: () => fetchPrinter(id),
    enabled: !!id,
  });

  const { data: maintenance } = useQuery<MaintenanceRecord[]>({
    queryKey: ['printer-maintenance', id],
    queryFn: () => fetchPrinterMaintenance(id),
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => deletePrinter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      router.push('/dashboard/printers');
    },
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error || !printer) {
    return (
      <Box>
        <Alert severity="error">{error instanceof Error ? error.message : 'Impresora no encontrada'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>Volver</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>Volver</Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
          <PrinterImage src={printer.image_url} alt={printer.name} sx={styles.headerImage} iconSize={96} />
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box>
                <Typography variant="h5" fontWeight={600}>{printer.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {[printer.brand, printer.model].filter(Boolean).join(' · ') || 'Marca no especificada'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
                  Editar
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<ArchiveIcon />}
                  onClick={() => { if (confirm('¿Archivar esta impresora?')) archiveMutation.mutate(); }}>
                  Archivar
                </Button>
              </Stack>
            </Box>
            {printer.nozzle_sizes.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                {printer.nozzle_sizes.map((n) => (
                  <Chip key={n} label={`${n} mm`} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
            {printer.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {printer.notes}
              </Typography>
            )}
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
          <Box>
            <Typography sx={styles.fieldLabel}>Potencia</Typography>
            <Typography sx={styles.fieldValue}>{printer.power_watts != null ? `${printer.power_watts} W` : '—'}</Typography>
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Vida útil</Typography>
            <Typography sx={styles.fieldValue}>{printer.lifespan_hours != null ? `${printer.lifespan_hours} h` : '—'}</Typography>
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Costo repuestos / máquina</Typography>
            <Typography sx={styles.fieldValue}>{formatMoney(printer.spare_parts_cost)}</Typography>
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Estado</Typography>
            <Chip label={printer.is_active ? 'Activa' : 'Archivada'} size="small" color={printer.is_active ? 'success' : 'default'} />
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Creada</Typography>
            <Typography sx={styles.fieldValue}>{new Date(printer.created_at).toLocaleDateString()}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Historial de mantenimiento</Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setMaintenanceOpen(true)}>
            Agregar mantenimiento
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {maintenance && maintenance.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Costo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.maintenance_date + 'T00:00:00').toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={maintenanceLabel(m.maintenance_type)} size="small" color={maintenanceColor(m.maintenance_type)} />
                    </TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell align="right">{formatMoney(m.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">Sin registros de mantenimiento.</Typography>
        )}
      </Paper>

      {printer && <PrinterFormDialog open={editOpen} onClose={() => setEditOpen(false)} printer={printer} />}
      <AddMaintenanceDialog open={maintenanceOpen} onClose={() => setMaintenanceOpen(false)} printerId={printer.id} />
    </Box>
  );
}
