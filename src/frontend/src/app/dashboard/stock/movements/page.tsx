'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  TextField, Stack, FormControl, InputLabel, Select, MenuItem,
  TablePagination, Button,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchFilaments, fetchStockMovements, type Filament } from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  header: { mb: 3 },
  filters: { mb: 3 },
  chip: { textTransform: 'capitalize' },
};

const MOVEMENT_TYPES = ['consumption', 'adjustment', 'reversal'];

function movementTypeColor(type: string) {
  switch (type) {
    case 'consumption': return 'error' as const;
    case 'adjustment': return 'info' as const;
    case 'reversal': return 'success' as const;
    default: return 'default' as const;
  }
}

function movementTypeLabel(type: string) {
  switch (type) {
    case 'consumption': return 'Consumo';
    case 'adjustment': return 'Ajuste';
    case 'reversal': return 'Reversión';
    default: return type;
  }
}

export default function MovementsPage() {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [movementType, setMovementType] = useState<string>('');
  const [filamentFilter, setFilamentFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: filaments } = useQuery<Filament[]>({
    queryKey: ['filaments-all'],
    queryFn: () => fetchFilaments(true),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', page, perPage, movementType, filamentFilter, dateFrom, dateTo],
    queryFn: () => fetchStockMovements({
      movement_type: movementType || undefined,
      filament_id: filamentFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: page + 1,
      per_page: perPage,
    }),
  });

  return (
    <Box>
      <Box sx={styles.header}>
        <Typography variant="h5" fontWeight={600}>Movimientos de Stock</Typography>
      </Box>

      <Paper sx={{ p: 2, ...styles.filters }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={movementType} label="Tipo" onChange={(e) => { setMovementType(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {MOVEMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{movementTypeLabel(t)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filamento</InputLabel>
            <Select value={filamentFilter} label="Filamento" onChange={(e) => { setFilamentFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {filaments?.map((f) => <MenuItem key={f.id} value={f.id}>{f.color_name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="Desde" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <TextField size="small" type="date" label="Hasta" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <Button size="small" onClick={() => { setMovementType(''); setFilamentFilter(''); setDateFrom(''); setDateTo(''); setPage(0); }}>
            Limpiar
          </Button>
        </Stack>
      </Paper>

      <Paper>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Filamento</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Cantidad (g)</TableCell>
                    <TableCell>Orden</TableCell>
                    <TableCell>Notas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.items.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>{new Date(m.created_at).toLocaleString()}</TableCell>
                      <TableCell>{m.filament_color_name || m.filament_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Chip label={movementTypeLabel(m.movement_type)} size="small"
                          color={movementTypeColor(m.movement_type)} sx={styles.chip} />
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 600,
                        color: m.quantity_grams < 0 ? 'error.main' : 'success.main',
                      }}>
                        {m.quantity_grams > 0 ? '+' : ''}{m.quantity_grams.toFixed(1)}
                      </TableCell>
                      <TableCell>{m.order_reference || '-'}</TableCell>
                      <TableCell>{m.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data?.total ?? 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={perPage}
              onRowsPerPageChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
