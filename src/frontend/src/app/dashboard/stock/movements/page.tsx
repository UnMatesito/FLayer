'use client';

import { useState } from 'react';
import {
  Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem,
  Select, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  fetchFilaments, fetchStockMovements, fetchSupplies, type Filament, type Supply, type StockMovement,
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

function movementAmount(m: StockMovement): { value: number; unit: string } {
  if (m.quantity !== null && m.quantity !== undefined) {
    return { value: m.quantity, unit: m.unit ?? '' };
  }
  return { value: m.quantity_grams ?? 0, unit: 'g' };
}

function movementItemName(m: StockMovement) {
  if (m.supply_name) return m.supply_name;
  if (m.filament_color_name) return m.filament_color_name;
  return (m.supply_id ?? m.filament_id ?? '').slice(0, 8);
}

export default function MovementsPage() {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [movementType, setMovementType] = useState<string>('');
  const [filamentFilter, setFilamentFilter] = useState<string>('');
  const [supplyFilter, setSupplyFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: filaments } = useQuery<Filament[]>({
    queryKey: ['filaments-all'],
    queryFn: () => fetchFilaments(true),
  });

  const { data: supplies } = useQuery<Supply[]>({
    queryKey: ['supplies-all'],
    queryFn: () => fetchSupplies(true),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', page, perPage, movementType, filamentFilter, supplyFilter, dateFrom, dateTo],
    queryFn: () => fetchStockMovements({
      movement_type: movementType || undefined,
      filament_id: filamentFilter || undefined,
      supply_id: supplyFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: page + 1,
      per_page: perPage,
    }),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">Historial</h2>
      </div>

      <div className="mb-6 card rounded-md border border-line bg-snow p-4">
        <h1 className="text-[1.25rem] font-semibold mb-2">Filtros</h1>
        <div className="flex flex-wrap gap-2">
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Insumo</InputLabel>
            <Select value={supplyFilter} label="Insumo" onChange={(e) => { setSupplyFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {supplies?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="Desde" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <TextField size="small" type="date" label="Hasta" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
          <Button size="small" onClick={() => { setMovementType(''); setFilamentFilter(''); setSupplyFilter(''); setDateFrom(''); setDateTo(''); setPage(0); }}>
            Limpiar
          </Button>
        </div>
      </div>

      <div className="card rounded-md border border-line bg-snow">
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
                  {data?.items.map((m) => {
                    const { value, unit } = movementAmount(m);
                    const negative = value < 0;
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell align="center">{new Date(m.created_at).toLocaleString()}</TableCell>
                        <TableCell align="center">{movementItemName(m)}</TableCell>
                        <TableCell align="center">
                          <Chip label={movementTypeLabel(m.movement_type)} size="small"
                            color={movementTypeColor(m.movement_type)} className="capitalize" />
                        </TableCell>
                        <TableCell align="center" className={negative ? 'font-semibold text-error' : 'font-semibold text-success'}>
                          {value > 0 ? '+' : ''}{value.toFixed(1)} {unit}
                        </TableCell>
                        <TableCell align="center">{m.order_reference || '-'}</TableCell>
                        <TableCell align="center">{m.notes || '-'}</TableCell>
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
