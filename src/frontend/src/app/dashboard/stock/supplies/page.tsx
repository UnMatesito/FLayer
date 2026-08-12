'use client';

import { useState } from 'react';
import {
  Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem,
  Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RemoveIcon from '@mui/icons-material/Remove';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSupplies, createSupply, updateSupply, adjustSupply, type Supply, type SupplyCreate,
} from '@/app/api';
import Pagination, { usePagination } from '@/components/Pagination';

const styles: Record<string, SxProps<Theme>> = {
  lowStockRow: {
    bgcolor: 'warning.50',
    '&:hover': { bgcolor: 'warning.100' },
  },
};

const SUPPLY_UNITS = ['liters', 'units', 'kg', 'meters', 'ml', 'pieces'];

function AddSupplyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupplyCreate>({ name: '', quantity: 1, unit: 'units', min_stock_warning: 1 });

  const mutation = useMutation({
    mutationFn: () => createSupply(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      onClose();
      setForm({ name: '', quantity: 1, unit: 'units', min_stock_warning: 1 });
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Agregar Insumo</DialogTitle>
      <DialogContent>
        <div className="mt-2 flex flex-col gap-2">
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Cantidad" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Unidad</InputLabel>
            <Select value={form.unit} label="Unidad" onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {SUPPLY_UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Stock mínimo de advertencia" type="number" value={form.min_stock_warning} onChange={(e) => setForm({ ...form, min_stock_warning: Number(e.target.value) })} fullWidth />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.name || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function QuantityStepper({ supply }: { supply: Supply }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(supply.quantity));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
    queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
  };

  const adjustMutation = useMutation({
    mutationFn: (delta: number) => adjustSupply(supply.id, { delta }),
    onSuccess: () => {
      refresh();
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => adjustSupply(supply.id, { delta: Number(value) - supply.quantity }),
    onSuccess: () => {
      refresh();
      setEditing(false);
    },
  });

  return (
    <div className="flex items-center justify-center gap-1">
      <Tooltip title="Disminuir stock">
        <span>
          <IconButton
            size="small"
            aria-label="Disminuir stock"
            disabled={supply.quantity <= 0 || adjustMutation.isPending}
            onClick={() => adjustMutation.mutate(-1)}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {editing ? (
        <div className="flex items-center gap-1">
          <TextField
            size="small"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            sx={{ width: 84 }}
            autoFocus
          />
          <Button size="small" variant="contained" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            OK
          </Button>
          <Button size="small" onClick={() => { setValue(String(supply.quantity)); setEditing(false); }}>X</Button>
        </div>
      ) : (
        <>
          <Tooltip title="Haz clic para ajustar el valor exacto">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-w-[72px] rounded-md border border-line bg-plate px-2 py-1 text-center text-sm font-semibold tabular-nums transition-colors hover:border-primary"
            >
              {supply.quantity} <span className="font-normal text-slate">{supply.unit}</span>
            </button>
          </Tooltip>
          <Tooltip title="Aumentar stock">
            <span>
              <IconButton
                size="small"
                aria-label="Aumentar stock"
                disabled={adjustMutation.isPending}
                onClick={() => adjustMutation.mutate(1)}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
    </div>
  );
}

export default function SuppliesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: supplies, isLoading } = useQuery<Supply[]>({
    queryKey: ['supplies'],
    queryFn: () => fetchSupplies(),
  });
  const pagination = usePagination(supplies?.length ?? 0, 50);

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">Insumos</h2>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>Agregar Insumo</Button>
      </div>

      <div className="card rounded-md border border-line bg-snow">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Nombre</TableCell>
              <TableCell align="center">Cantidad</TableCell>
              <TableCell align="center">Stock Mínimo</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagination.slice(supplies ?? []).map((s) => {
              const isLow = s.quantity < s.min_stock_warning;
              return (
                <TableRow key={s.id} hover sx={isLow ? styles.lowStockRow : {}}>
                  <TableCell align="center" className="font-medium">{s.name}</TableCell>
                  <TableCell align="center"><QuantityStepper supply={s} /></TableCell>
                  <TableCell align="center">{s.min_stock_warning} {s.unit}</TableCell>
                  <TableCell align="center">
                    {isLow ? (
                      <Chip icon={<WarningAmberIcon />} label="Stock bajo" size="small" color="warning" />
                    ) : (
                      <Chip label="OK" size="small" color="success" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination
          count={supplies?.length ?? 0}
          page={pagination.page}
          onPageChange={pagination.setPage}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
        />
      </div>

      <AddSupplyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
