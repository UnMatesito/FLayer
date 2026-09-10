'use client';

import { useState } from 'react';
import {
  Button, Checkbox, Chip, CircularProgress, FormControl, InputLabel, ListItemText, MenuItem,
  Select, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMovementItems, fetchUnifiedMovements, type MovementItemOption, type UnifiedMovement,
} from '@/app/api';
import Pagination from '@/components/Pagination';

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

function optionLabel(option: MovementItemOption) {
  return `${option.type_label} · ${option.label}`;
}

export default function MovementsPage() {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [movementType, setMovementType] = useState<string>('');
  const [itemKeys, setItemKeys] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: movementItems } = useQuery<MovementItemOption[]>({
    queryKey: ['movement-items'],
    queryFn: () => fetchMovementItems(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements-unified', page, perPage, movementType, itemKeys, dateFrom, dateTo],
    queryFn: () => fetchUnifiedMovements({
      movement_type: movementType || undefined,
      item_keys: itemKeys.length ? itemKeys : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: page + 1,
      per_page: perPage,
    }),
  });

  const optionsByKey = new Map((movementItems ?? []).map((option) => [option.key, option]));
  const resetFilters = () => {
    setMovementType('');
    setItemKeys([]);
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">Historial</h2>
      </div>

      <div className="card rounded-md border border-line bg-snow">
        <div className="border-b border-line p-4">
        <h1 className="text-[1.25rem] font-semibold mb-2">Filtros de Historial</h1>
        <div className="flex flex-wrap gap-2">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={movementType} label="Tipo" onChange={(e) => { setMovementType(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {MOVEMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{movementTypeLabel(t)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 } }}>
            <InputLabel>Elemento</InputLabel>
            <Select
              multiple
              value={itemKeys}
              label="Elemento"
              renderValue={(selected) => selected.map((key) => optionsByKey.get(key)?.label ?? key).join(', ')}
              onChange={(e) => { setItemKeys(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value); setPage(0); }}
            >
              {(movementItems ?? []).map((option) => (
                <MenuItem key={option.key} value={option.key}>
                  <Checkbox checked={itemKeys.includes(option.key)} />
                  <ListItemText primary={option.label} secondary={option.type_label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="Desde" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <TextField size="small" type="date" label="Hasta" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <Button size="small" onClick={resetFilters}>
            Limpiar
          </Button>
          <p className="ml-auto text-[0.8rem] text-slate">{data?.total ?? 0} movimientos</p>
        </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center p-4"><CircularProgress /></div>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">Fecha</TableCell>
                    <TableCell align="center">Elemento</TableCell>
                    <TableCell align="center">Tipo</TableCell>
                    <TableCell align="center">Cantidad</TableCell>
                    <TableCell align="center">Orden</TableCell>
                    <TableCell align="center">Notas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" className="py-8 text-slate">
                        <div className="flex flex-col items-center gap-1">
                          <p>Historial no tiene movimientos con los filtros activos.</p>
                          <Button size="small" onClick={resetFilters}>Limpiar filtros</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : data?.items.map((m: UnifiedMovement) => {
                    const value = m.quantity;
                    const unit = m.unit;
                    const negative = value < 0;
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell align="center">{new Date(m.created_at).toLocaleString()}</TableCell>
                        <TableCell align="center"><Chip label={m.item_type_label} size="small" variant="outlined" sx={{ mr: 1 }} />{m.item_name}</TableCell>
                        <TableCell align="center">
                          <Chip label={movementTypeLabel(m.movement_type)} size="small"
                            color={movementTypeColor(m.movement_type)} className="capitalize" />
                        </TableCell>
                        <TableCell align="center" className={negative ? 'font-semibold text-error' : 'font-semibold text-success'}>
                          {value > 0 ? '+' : ''}{value.toFixed(1)} {unit}
                        </TableCell>
                        <TableCell align="center">{m.order_id ? `${m.order_id.slice(0, 8)}…` : '-'}</TableCell>
                        <TableCell align="center">{typeof m.metadata.notes === 'string' && m.metadata.notes ? m.metadata.notes : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Pagination
              count={data?.total ?? 0}
              page={page}
              onPageChange={setPage}
              rowsPerPage={perPage}
              onRowsPerPageChange={(rows) => { setPerPage(rows); setPage(0); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
