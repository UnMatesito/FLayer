'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Alert, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFilament, updateFilament, adjustFilamentWeight,
  fetchStockMovements, type Filament, type FilamentAdjustResponse, type FilamentSettings,
} from '@/app/api';
import { FilamentIcon } from '@/components/FilamentIcon';

function movementTypeColor(type: string) {
  switch (type) {
    case 'consumption': return 'error' as const;
    case 'adjustment': return 'info' as const;
    case 'reversal': return 'success' as const;
    default: return 'default' as const;
  }
}

function AdjustWeightDialog({ open, onClose, filamentId }: { open: boolean; onClose: () => void; filamentId: string }) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation<FilamentAdjustResponse, Error>({
    mutationFn: () => adjustFilamentWeight(filamentId, { delta_grams: Number(delta), notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filament', filamentId] });
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['movements', filamentId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      onClose();
      setDelta('');
      setNotes('');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ajustar Peso</DialogTitle>
      <DialogContent>
        <div className="mt-1 flex flex-col gap-2">
          <TextField
            label="Delta (gramos)"
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            fullWidth
            required
            helperText="Usa valores positivos para agregar, negativos para restar"
          />
          <TextField
            label="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={!delta || mutation.isPending}>
          {mutation.isPending ? 'Ajustando...' : 'Ajustar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SettingsDialog({ open, onClose, filament, filamentId }: { open: boolean; onClose: () => void; filament: Filament; filamentId: string }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FilamentSettings>(filament.settings ?? {});

  const setSetting = (key: keyof FilamentSettings, value: number | undefined) => {
    setSettings({ ...settings, [key]: value });
  };

  const mutation = useMutation({
    mutationFn: () => updateFilament(filamentId, { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filament', filamentId] });
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Editar configuración de impresión</DialogTitle>
      <DialogContent>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <TextField label="Temp. boquilla mín. recomendada" type="number" value={settings.recommended_nozzle_temp_min ?? ''} onChange={(e) => setSetting('recommended_nozzle_temp_min', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
          <TextField label="Temp. boquilla máx. recomendada" type="number" value={settings.recommended_nozzle_temp_max ?? ''} onChange={(e) => setSetting('recommended_nozzle_temp_max', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
          <TextField label="Flow Ratio" type="number" value={settings.flow_ratio ?? ''} onChange={(e) => setSetting('flow_ratio', e.target.value ? Number(e.target.value) : undefined)} fullWidth inputProps={{ step: 0.01 }} />
          <TextField label="Temp. boquilla (°C)" type="number" value={settings.nozzle_temperature ?? ''} onChange={(e) => setSetting('nozzle_temperature', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
          <TextField label="Velocidad volumétrica máx. (mm³/s)" type="number" value={settings.max_volumetric_speed ?? ''} onChange={(e) => setSetting('max_volumetric_speed', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
          <TextField label="Pressure Advance" type="number" value={settings.pressure_advance ?? ''} onChange={(e) => setSetting('pressure_advance', e.target.value ? Number(e.target.value) : undefined)} fullWidth inputProps={{ step: 0.01 }} />
          <FormControl fullWidth>
            <InputLabel>Diámetro nominal</InputLabel>
            <Select value={settings.nominal_diameter ?? 1.75} label="Diámetro nominal" onChange={(e) => setSetting('nominal_diameter', Number(e.target.value))}>
              <MenuItem value={1.75}>1.75 mm</MenuItem>
              <MenuItem value={2.85}>2.85 mm</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Temp. cama (°C)" type="number" value={settings.plate_temperature ?? ''} onChange={(e) => setSetting('plate_temperature', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FilamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);

  const { data: filament, isLoading, error } = useQuery<Filament>({
    queryKey: ['filament', id],
    queryFn: () => fetchFilament(id),
    enabled: !!id,
  });

  const { data: movements } = useQuery({
    queryKey: ['movements', id],
    queryFn: () => fetchStockMovements({ filament_id: id, per_page: 20 }),
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => updateFilament(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['filament', id] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      router.push('/dashboard/stock/filaments');
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  if (error || !filament) {
    return (
      <div>
        <Alert severity="error">{error instanceof Error ? error.message : 'Filamento no encontrado'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>Volver</Button>
      </div>
    );
  }

  const isLow = filament.weight_grams < filament.min_stock_warning_grams;

  return (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>Volver</Button>

      <div className="mb-3 card rounded-md border border-line bg-snow p-4">
        <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FilamentIcon color={filament.color_hex} size={48} />
              <div>
              <h2 className="text-[1.5rem] font-semibold">{filament.color_name}</h2>
              <p className="text-sm text-slate">
                {filament.brand ? `${filament.brand} — ` : ''}{filament.filament_type}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsDialog(true)}>
              Configuración
            </Button>
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setAdjustDialog(true)}>
              Ajustar Peso
            </Button>
            <Button size="small" variant="outlined" color="error" startIcon={<ArchiveIcon />}
              onClick={() => { if (confirm('¿Archivar este filamento?')) archiveMutation.mutate(); }}>
              Archivar
            </Button>
          </div>
        </div>

        <hr className="mb-3 border-line" />

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          <div>
            <p className="mb-0.5 text-xs text-slate">Peso Actual</p>
            <p className="font-medium">
              {filament.weight_grams.toFixed(1)}g
              {isLow && <Chip icon={<WarningAmberIcon />} label="Stock bajo" size="small" color="warning" sx={{ ml: 1 }} />}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Precio por kg</p>
            <p className="font-medium">${filament.price_per_kg.toFixed(2)}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Stock Mínimo</p>
            <p className="font-medium">{filament.min_stock_warning_grams}g</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Estado</p>
            <Chip label={filament.is_active ? 'Activo' : 'Archivado'} size="small" color={filament.is_active ? 'success' : 'default'} />
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Color Hex</p>
            <p className="font-mono font-medium">{filament.color_hex}</p>
          </div>
        </div>

        {filament.settings && (
          <>
            <hr className="my-3 border-line" />
            <h3 className="mb-2 text-[1.25rem] font-semibold">Configuración de impresión</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {filament.settings.recommended_nozzle_temp_min != null && filament.settings.recommended_nozzle_temp_max != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Temp. boquilla recomendada</p>
                  <p className="font-medium">{filament.settings.recommended_nozzle_temp_min}°C — {filament.settings.recommended_nozzle_temp_max}°C</p>
                </div>
              )}
              {filament.settings.nozzle_temperature != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Temp. boquilla</p>
                  <p className="font-medium">{filament.settings.nozzle_temperature}°C</p>
                </div>
              )}
              {filament.settings.flow_ratio != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Flow Ratio</p>
                  <p className="font-medium">{filament.settings.flow_ratio}</p>
                </div>
              )}
              {filament.settings.max_volumetric_speed != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Velocidad volumétrica máx.</p>
                  <p className="font-medium">{filament.settings.max_volumetric_speed} mm³/s</p>
                </div>
              )}
              {filament.settings.pressure_advance != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Pressure Advance</p>
                  <p className="font-medium">{filament.settings.pressure_advance}</p>
                </div>
              )}
              {filament.settings.nominal_diameter != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Diámetro nominal</p>
                  <p className="font-medium">{filament.settings.nominal_diameter} mm</p>
                </div>
              )}
              {filament.settings.plate_temperature != null && (
                <div>
                  <p className="mb-0.5 text-xs text-slate">Temp. cama</p>
                  <p className="font-medium">{filament.settings.plate_temperature}°C</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card rounded-md border border-line bg-snow p-4">
        <h3 className="mb-2 text-[1.25rem] font-semibold">Historial de Movimientos</h3>
        {movements && movements.items.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad (g)</TableCell>
                  <TableCell>Orden</TableCell>
                  <TableCell>Notas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={m.movement_type} size="small" color={movementTypeColor(m.movement_type)} sx={{ textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: (m.quantity_grams ?? 0) < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                      {(m.quantity_grams ?? 0) > 0 ? '+' : ''}{(m.quantity_grams ?? 0).toFixed(1)}
                    </TableCell>
                    <TableCell>{m.order_reference || '-'}</TableCell>
                    <TableCell>{m.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <p className="text-sm text-slate">Sin movimientos registrados.</p>
        )}
      </div>

      <AdjustWeightDialog open={adjustDialog} onClose={() => setAdjustDialog(false)} filamentId={id} />
      {filament && (
        <SettingsDialog open={settingsDialog} onClose={() => setSettingsDialog(false)} filament={filament} filamentId={id} />
      )}
    </div>
  );
}
