'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, Collapse, Drawer, FormControl, IconButton, InputLabel,
  MenuItem, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SxProps, Theme } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFilaments, createFilament, updateFilament,
  type Filament, type FilamentCreate, type FilamentSettings,
} from '@/app/api';
import { FilamentIcon } from '@/components/FilamentIcon';
import Pagination, { usePagination } from '@/components/Pagination';
import { useDashboardFeedback } from '../../feedback';
import { normalizeApiError } from '@/app/error-normalizer';

const styles: Record<string, SxProps<Theme>> = {
  lowStockRow: {
    bgcolor: 'warning.50',
    '&:hover': { bgcolor: 'warning.100' },
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

function AddFilamentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const feedback = useDashboardFeedback();
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
      feedback.success('Filamento guardado');
    },
    onError: (err: unknown) => feedback.error(normalizeApiError(err, 'No se pudo crear el filamento')),
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 540 }, maxWidth: '100vw' } } }}>
      <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="text-[1.15rem] font-semibold">Agregar Filamento</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mt-2 flex flex-col gap-2">
          <TextField label="Nombre de color" value={form.color_name} onChange={(e) => setForm({ ...form, color_name: e.target.value })} fullWidth required />
          <TextField label="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} fullWidth />
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate">Color</span>
            <label className="flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-md border border-line p-1">
              <input type="color" value={form.color_hex} onChange={(e) => setForm({ ...form, color_hex: e.target.value })} className="h-full w-full cursor-pointer border-none bg-transparent p-0" />
            </label>
          </div>
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
            <div className="grid grid-cols-1 gap-2 rounded-md bg-plate p-3 sm:grid-cols-2">
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
            </div>
          </Collapse>
        </div>
      </div>
      <div className="flex justify-end gap-1 border-t border-line p-2">
        <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.color_name || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
      </div>
    </Drawer>
  );
}

export default function FilamentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const paper = theme.vars?.palette.background.paper ?? theme.palette.background.paper;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');
  const feedback = useDashboardFeedback();

  const { data: filaments, isLoading } = useQuery<Filament[]>({
    queryKey: ['filaments', { archived: showArchived }],
    queryFn: () => fetchFilaments(showArchived),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateFilament(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      feedback.success('Filamento archivado');
    },
    onError: (err: unknown) => feedback.error(normalizeApiError(err, 'No se pudo archivar el filamento')),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateFilament(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      feedback.success('Filamento restaurado');
    },
    onError: (err: unknown) => feedback.error(normalizeApiError(err, 'No se pudo restaurar el filamento')),
  });

  const visible = (showArchived
    ? filaments?.filter((f) => !f.is_active) ?? []
    : filaments?.filter((f) => f.is_active) ?? [])
    .filter((f) => `${f.color_name} ${f.brand}`.toLowerCase().includes(search.toLowerCase()))
    .filter((f) => !typeFilter || f.filament_type === typeFilter)
    .filter((f) => stockFilter === 'all' || (stockFilter === 'low' ? f.weight_grams < f.min_stock_warning_grams : f.weight_grams >= f.min_stock_warning_grams));
  const lowCount = filaments?.filter((f) => f.is_active && f.weight_grams < f.min_stock_warning_grams).length ?? 0;
  const pagination = usePagination(visible.length, 50);

  useEffect(() => {
    pagination.setPage(0);
  }, [search, typeFilter, stockFilter, showArchived]);

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">
          {showArchived ? 'Filamentos archivados' : 'Filamentos'}
        </h2>
        <div className="flex gap-1">
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
        </div>
      </div>

      <div className="card rounded-md border border-line bg-snow">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <TextField size="small" label="Buscar filamento" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 240 } }} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={typeFilter} label="Tipo" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {FILAMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Stock</InputLabel>
            <Select value={stockFilter} label="Stock" onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="low">Stock bajo</MenuItem>
              <MenuItem value="ok">OK</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" onClick={() => { setSearch(''); setTypeFilter(''); setStockFilter('all'); }}>Limpiar filtros</Button>
          <p className="ml-auto text-[0.8rem] text-slate">{visible.length} resultados · {lowCount} stock bajo</p>
          {lowCount === 0 && !showArchived && <p className="basis-full text-[0.82rem] text-slate">Stock normal: todos los filamentos están por encima del mínimo.</p>}
        </div>
        <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Color</TableCell>
              <TableCell align="center">Nombre</TableCell>
              <TableCell align="center">Marca</TableCell>
              <TableCell align="center">Tipo</TableCell>
              <TableCell align="center">Peso (g)</TableCell>
              <TableCell align="center">Precio/kg</TableCell>
              <TableCell align="center">Stock</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" className="py-8 text-slate">
                  {showArchived ? 'No hay filamentos archivados.' : 'No hay filamentos registrados.'}
                </TableCell>
              </TableRow>
            ) : (
              pagination.slice(visible).map((f) => {
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
                    <TableCell align="center">
                      <span className="flex items-center justify-center">
                        <FilamentIcon color={f.color_hex} size={24} hole={paper} />
                      </span>
                    </TableCell>
                    <TableCell align="center">{f.color_name}</TableCell>
                    <TableCell align="center">{f.brand || '-'}</TableCell>
                    <TableCell align="center"><Chip label={f.filament_type} size="small" variant="outlined" /></TableCell>
                    <TableCell align="center">{f.weight_grams.toFixed(1)}g</TableCell>
                    <TableCell align="center">${f.price_per_kg.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      {!showArchived && isLow && (
                        <Chip icon={<WarningAmberIcon />} label="Stock bajo" size="small" color="warning" />
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
        </div>
        <Pagination
          count={visible.length}
          page={pagination.page}
          onPageChange={pagination.setPage}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
        />
      </div>

      {!showArchived && <AddFilamentDrawer open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
