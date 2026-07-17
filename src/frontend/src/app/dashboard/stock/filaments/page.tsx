'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, IconButton, Select, MenuItem, FormControl, InputLabel,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFilaments, createFilament, updateFilament,
  type Filament, type FilamentCreate, type FilamentSettings,
} from '@/app/api';
import { FilamentIcon } from '@/components/FilamentIcon';

const styles: Record<string, SxProps<Theme>> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3,
  },
  lowStockRow: {
    bgcolor: 'warning.50',
    '&:hover': { bgcolor: 'warning.100' },
  },
  lowStockChip: {
    ml: 1,
  },
  colorInput: {
    width: 40, height: 40, p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1,
    '& input': { width: '100%', height: '100%', p: 0, border: 'none', cursor: 'pointer', bgcolor: 'transparent' },
  },
};

const FILAMENT_TYPES = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Nylon', 'PC', 'PEEK'];

const DEFAULT_SETTINGS: FilamentSettings = {
  recommended_nozzle_temp_min: 190,
  recommended_nozzle_temp_max: 240,
  flow_ratio: 0.98,
  nozzle_temperature: 220,
  max_volumetric_speed: 24,
  pressure_advance: 0.02,
  nominal_diameter: 1.75,
  plate_temperature: 65,
};

function AddFilamentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FilamentCreate>({
    color_name: '', color_hex: '#000000', brand: '', filament_type: 'PLA',
    weight_grams: 1000, price_per_kg: 19000, min_stock_warning_grams: 200,
    settings: { ...DEFAULT_SETTINGS },
  });
  const [settingsOpen, setSettingsOpen] = useState(true);

  const setSetting = (key: keyof FilamentSettings, value: number | undefined) => {
    setForm({ ...form, settings: { ...form.settings, [key]: value } as FilamentSettings });
  };

  const mutation = useMutation({
    mutationFn: () => createFilament(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      onClose();
      setForm({ color_name: '', color_hex: '#000000', brand: '', filament_type: 'PLA', weight_grams: 1000, price_per_kg: 25, min_stock_warning_grams: 200, settings: { ...DEFAULT_SETTINGS } });
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Agregar Filamento</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Nombre de color" value={form.color_name} onChange={(e) => setForm({ ...form, color_name: e.target.value })} fullWidth required />
          <TextField label="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} fullWidth />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Color</Typography>
            <Box component="label" sx={styles.colorInput}>
              <input type="color" value={form.color_hex} onChange={(e) => setForm({ ...form, color_hex: e.target.value })} />
            </Box>
          </Box>
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select value={form.filament_type} label="Tipo" onChange={(e) => setForm({ ...form, filament_type: e.target.value })}>
              {FILAMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Peso (gramos)" type="number" value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: Number(e.target.value) })} fullWidth />
          <TextField label="Precio por kg" type="number" value={form.price_per_kg} onChange={(e) => setForm({ ...form, price_per_kg: Number(e.target.value) })} fullWidth />
          <TextField label="Stock mínimo (gramos)" type="number" value={form.min_stock_warning_grams} onChange={(e) => setForm({ ...form, min_stock_warning_grams: Number(e.target.value) })} fullWidth />

          <Button
            size="small"
            startIcon={<SettingsIcon />}
            endIcon={<ExpandMoreIcon sx={{ transform: settingsOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
            onClick={() => setSettingsOpen(!settingsOpen)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Configuración de impresión
          </Button>

          <Collapse in={settingsOpen}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <TextField label="Temp. boquilla mín. recomendada" type="number" value={form.settings?.recommended_nozzle_temp_min ?? ''} onChange={(e) => setSetting('recommended_nozzle_temp_min', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
              <TextField label="Temp. boquilla máx. recomendada" type="number" value={form.settings?.recommended_nozzle_temp_max ?? ''} onChange={(e) => setSetting('recommended_nozzle_temp_max', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
              <TextField label="Flow Ratio" type="number" value={form.settings?.flow_ratio ?? ''} onChange={(e) => setSetting('flow_ratio', e.target.value ? Number(e.target.value) : undefined)} fullWidth inputProps={{ step: 0.01 }} />
              <TextField label="Temp. boquilla (°C)" type="number" value={form.settings?.nozzle_temperature ?? ''} onChange={(e) => setSetting('nozzle_temperature', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
              <TextField label="Velocidad volumétrica máx. (mm³/s)" type="number" value={form.settings?.max_volumetric_speed ?? ''} onChange={(e) => setSetting('max_volumetric_speed', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
              <TextField label="Pressure Advance" type="number" value={form.settings?.pressure_advance ?? ''} onChange={(e) => setSetting('pressure_advance', e.target.value ? Number(e.target.value) : undefined)} fullWidth inputProps={{ step: 0.01 }} />
              <FormControl fullWidth>
                <InputLabel>Diámetro nominal</InputLabel>
                <Select value={form.settings?.nominal_diameter ?? 1.75} label="Diámetro nominal" onChange={(e) => setSetting('nominal_diameter', Number(e.target.value))}>
                  <MenuItem value={1.75}>1.75 mm</MenuItem>
                  <MenuItem value={2.85}>2.85 mm</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Temp. cama (°C)" type="number" value={form.settings?.plate_temperature ?? ''} onChange={(e) => setSetting('plate_temperature', e.target.value ? Number(e.target.value) : undefined)} fullWidth />
            </Box>
          </Collapse>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.color_name || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FilamentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: filaments, isLoading } = useQuery<Filament[]>({
    queryKey: ['filaments', { archived: showArchived }],
    queryFn: () => fetchFilaments(showArchived),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateFilament(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateFilament(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  const visible = showArchived
    ? filaments?.filter((f) => !f.is_active) ?? []
    : filaments?.filter((f) => f.is_active) ?? [];

  return (
    <Box>
      <Box sx={styles.header}>
        <Typography variant="h5" fontWeight={600}>
          {showArchived ? 'Filamentos archivados' : 'Filamentos'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={showArchived ? 'contained' : 'outlined'}
            startIcon={<ArchiveIcon />}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Ver activos' : 'Archivados'}
          </Button>
          {!showArchived && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>Agregar Filamento</Button>
          )}
        </Stack>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Color</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Peso (g)</TableCell>
              <TableCell align="right">Precio/kg</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {showArchived ? 'No hay filamentos archivados.' : 'No hay filamentos registrados.'}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((f) => {
                const isLow = f.weight_grams < f.min_stock_warning_grams;
                return (
                  <TableRow
                    key={f.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      opacity: showArchived ? 0.6 : 1,
                      ...(isLow && !showArchived ? styles.lowStockRow : {}),
                    }}
                    onClick={() => router.push(`/dashboard/stock/filaments/${f.id}`)}
                  >
                    <TableCell>
                      <FilamentIcon color={f.color_hex} size={24} />
                    </TableCell>
                    <TableCell>{f.color_name}</TableCell>
                    <TableCell>{f.brand || '-'}</TableCell>
                    <TableCell><Chip label={f.filament_type} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right">{f.weight_grams.toFixed(1)}g</TableCell>
                    <TableCell align="right">${f.price_per_kg.toFixed(2)}</TableCell>
                    <TableCell>
                      {!showArchived && isLow && (
                        <Chip icon={<WarningAmberIcon />} label="Stock bajo" size="small" color="warning" sx={styles.lowStockChip} />
                      )}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      {showArchived ? (
                        <IconButton
                          size="small"
                          color="primary"
                          title="Restaurar"
                          onClick={() => restoreMutation.mutate(f.id)}
                        >
                          <UnarchiveIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton
                          size="small"
                          color="error"
                          title="Archivar"
                          onClick={() => { if (confirm('¿Archivar este filamento?')) archiveMutation.mutate(f.id); }}
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!showArchived && <AddFilamentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </Box>
  );
}
