'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Alert, Stack, Divider, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFilament, updateFilament, adjustFilamentWeight,
  fetchStockMovements, type Filament, type FilamentAdjustResponse, type FilamentSettings,
} from '@/app/api';
import { FilamentIcon } from '@/components/FilamentIcon';

const styles: Record<string, SxProps<Theme>> = {
  fieldLabel: {
    color: 'text.secondary', fontSize: '0.8rem', mb: 0.5,
  },
  fieldValue: {
    fontWeight: 500,
  },
  lowStockChip: {
    ml: 1,
  },
  movementChip: {
    textTransform: 'capitalize',
  },
};

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
        <Stack spacing={2} sx={{ mt: 1 }}>
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
        </Stack>
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
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
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
        </Box>
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error || !filament) {
    return (
      <Box>
        <Alert severity="error">{error instanceof Error ? error.message : 'Filamento no encontrado'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>Volver</Button>
      </Box>
    );
  }

  const isLow = filament.weight_grams < filament.min_stock_warning_grams;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>Volver</Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FilamentIcon color={filament.color_hex} size={48} />
              <Box>
              <Typography variant="h5" fontWeight={600}>{filament.color_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {filament.brand ? `${filament.brand} — ` : ''}{filament.filament_type}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
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
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
          <Box>
            <Typography sx={styles.fieldLabel}>Peso Actual</Typography>
            <Typography sx={styles.fieldValue}>
              {filament.weight_grams.toFixed(1)}g
              {isLow && <Chip icon={<WarningAmberIcon />} label="Stock bajo" size="small" color="warning" sx={styles.lowStockChip} />}
            </Typography>
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Precio por kg</Typography>
            <Typography sx={styles.fieldValue}>${filament.price_per_kg.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Stock Mínimo</Typography>
            <Typography sx={styles.fieldValue}>{filament.min_stock_warning_grams}g</Typography>
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Estado</Typography>
            <Chip label={filament.is_active ? 'Activo' : 'Archivado'} size="small" color={filament.is_active ? 'success' : 'default'} />
          </Box>
          <Box>
            <Typography sx={styles.fieldLabel}>Color Hex</Typography>
            <Typography sx={styles.fieldValue} fontFamily="monospace">{filament.color_hex}</Typography>
          </Box>
        </Box>

        {filament.settings && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>Configuración de impresión</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
              {filament.settings.recommended_nozzle_temp_min != null && filament.settings.recommended_nozzle_temp_max != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Temp. boquilla recomendada</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.recommended_nozzle_temp_min}°C — {filament.settings.recommended_nozzle_temp_max}°C</Typography>
                </Box>
              )}
              {filament.settings.nozzle_temperature != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Temp. boquilla</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.nozzle_temperature}°C</Typography>
                </Box>
              )}
              {filament.settings.flow_ratio != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Flow Ratio</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.flow_ratio}</Typography>
                </Box>
              )}
              {filament.settings.max_volumetric_speed != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Velocidad volumétrica máx.</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.max_volumetric_speed} mm³/s</Typography>
                </Box>
              )}
              {filament.settings.pressure_advance != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Pressure Advance</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.pressure_advance}</Typography>
                </Box>
              )}
              {filament.settings.nominal_diameter != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Diámetro nominal</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.nominal_diameter} mm</Typography>
                </Box>
              )}
              {filament.settings.plate_temperature != null && (
                <Box>
                  <Typography sx={styles.fieldLabel}>Temp. cama</Typography>
                  <Typography sx={styles.fieldValue}>{filament.settings.plate_temperature}°C</Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Historial de Movimientos</Typography>
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
                      <Chip label={m.movement_type} size="small" color={movementTypeColor(m.movement_type)} sx={styles.movementChip} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: m.quantity_grams < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                      {m.quantity_grams > 0 ? '+' : ''}{m.quantity_grams.toFixed(1)}
                    </TableCell>
                    <TableCell>{m.order_reference || '-'}</TableCell>
                    <TableCell>{m.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">Sin movimientos registrados.</Typography>
        )}
      </Paper>

      <AdjustWeightDialog open={adjustDialog} onClose={() => setAdjustDialog(false)} filamentId={id} />
      {filament && (
        <SettingsDialog open={settingsDialog} onClose={() => setSettingsDialog(false)} filament={filament} filamentId={id} />
      )}
    </Box>
  );
}
