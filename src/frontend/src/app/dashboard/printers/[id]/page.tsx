'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, Alert, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, MenuItem, Select,
  InputLabel, FormControl,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
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
        <div className="mt-1 flex flex-col gap-2">
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
        </div>
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
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  if (error || !printer) {
    return (
      <div>
        <Alert severity="error">{error instanceof Error ? error.message : 'Impresora no encontrada'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>Volver</Button>
      </div>
    );
  }

  return (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>Volver</Button>

      <div className="mb-3 card rounded-md border border-line bg-snow p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row">
          <PrinterImage src={printer.image_url} alt={printer.name} className="h-[200px] w-[200px] shrink-0 rounded-md" iconSize={96} />
          <div className="grow">
            <div className="flex items-start justify-between gap-1">
              <div>
                <h2 className="text-[1.5rem] font-semibold">{printer.name}</h2>
                <p className="mt-0.5 text-sm text-slate">
                  {[printer.brand, printer.model].filter(Boolean).join(' · ') || 'Marca no especificada'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
                  Editar
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<ArchiveIcon />}
                  onClick={() => { if (confirm('¿Archivar esta impresora?')) archiveMutation.mutate(); }}>
                  Archivar
                </Button>
              </div>
            </div>
            {printer.nozzle_sizes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-0.5">
                {printer.nozzle_sizes.map((n) => (
                  <Chip key={n} label={`${n} mm`} size="small" variant="outlined" />
                ))}
              </div>
            )}
            {printer.notes && (
              <p className="mt-1.5 text-sm text-slate">
                {printer.notes}
              </p>
            )}
          </div>
        </div>

        <hr className="mb-3 border-line" />

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          <div>
            <p className="mb-0.5 text-xs text-slate">Potencia</p>
            <p className="font-medium">{printer.power_watts != null ? `${printer.power_watts} W` : '—'}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Vida útil</p>
            <p className="font-medium">{printer.lifespan_hours != null ? `${printer.lifespan_hours} h` : '—'}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Costo repuestos / máquina</p>
            <p className="font-medium">{formatMoney(printer.spare_parts_cost)}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Estado</p>
            <Chip label={printer.is_active ? 'Activa' : 'Archivada'} size="small" color={printer.is_active ? 'success' : 'default'} />
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Creada</p>
            <p className="font-medium">{new Date(printer.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="card rounded-md border border-line bg-snow p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[1.25rem] font-semibold">Historial de mantenimiento</h3>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setMaintenanceOpen(true)}>
            Agregar mantenimiento
          </Button>
        </div>
        <hr className="mb-2 border-line" />

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
          <p className="text-sm text-slate">Sin registros de mantenimiento.</p>
        )}
      </div>

      {printer && <PrinterFormDialog open={editOpen} onClose={() => setEditOpen(false)} printer={printer} />}
      <AddMaintenanceDialog open={maintenanceOpen} onClose={() => setMaintenanceOpen(false)} printerId={printer.id} />
    </div>
  );
}
