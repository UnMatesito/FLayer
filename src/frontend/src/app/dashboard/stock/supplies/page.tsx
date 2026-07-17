'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSupplies, createSupply, updateSupply, type Supply, type SupplyCreate } from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 },
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
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Cantidad" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Unidad</InputLabel>
            <Select value={form.unit} label="Unidad" onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {SUPPLY_UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Stock mínimo de advertencia" type="number" value={form.min_stock_warning} onChange={(e) => setForm({ ...form, min_stock_warning: Number(e.target.value) })} fullWidth />
        </Stack>
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

function EditQuantityCell({ supply }: { supply: Supply }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(supply.quantity));

  const mutation = useMutation({
    mutationFn: () => updateSupply(supply.id, { quantity: Number(value) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      setEditing(false);
    },
  });

  if (editing) {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <TextField size="small" type="number" value={value} onChange={(e) => setValue(e.target.value)} sx={{ width: 80 }} autoFocus />
        <Button size="small" variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          OK
        </Button>
        <Button size="small" onClick={() => { setValue(String(supply.quantity)); setEditing(false); }}>X</Button>
      </Box>
    );
  }

  return (
    <Box onClick={() => setEditing(true)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
      {supply.quantity} {supply.unit}
    </Box>
  );
}

export default function SuppliesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: supplies, isLoading } = useQuery<Supply[]>({
    queryKey: ['supplies'],
    queryFn: () => fetchSupplies(),
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={styles.header}>
        <Typography variant="h5" fontWeight={600}>Insumos</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>Agregar Insumo</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Stock Mínimo</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {supplies?.map((s) => {
              const isLow = s.quantity < s.min_stock_warning;
              return (
                <TableRow key={s.id} hover sx={isLow ? styles.lowStockRow : {}}>
                  <TableCell sx={{ fontWeight: 500 }}>{s.name}</TableCell>
                  <TableCell><EditQuantityCell supply={s} /></TableCell>
                  <TableCell>{s.min_stock_warning} {s.unit}</TableCell>
                  <TableCell>
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
      </TableContainer>

      <AddSupplyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}
