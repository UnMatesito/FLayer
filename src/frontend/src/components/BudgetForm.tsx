'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Box, Typography, IconButton,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  CircularProgress, Alert, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { SxProps, Theme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFilaments, createBudget, updateBudget, previewBudget,
  type BudgetResponse, type FilamentItemInput, type Filament,
} from '@/app/api';

interface FilamentItem {
  product_id: string | null;
  product_name: string | null;
  grams: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  orderId: string;
  existingBudget?: BudgetResponse | null;
}

const styles: Record<string, SxProps<Theme>> = {
  filamentRow: {
    display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
  },
};

function itemKey(index: number) {
  return `item-${index}`;
}

export default function BudgetForm({ open, onClose, orderId, existingBudget }: Props) {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(existingBudget?.currency ?? 'ARS');
  const [items, setItems] = useState<FilamentItem[]>(
    existingBudget?.filament_items?.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      grams: i.grams,
    })) ?? [{ product_id: null, product_name: null, grams: 100 }],
  );
  const [useManualFilament, setUseManualFilament] = useState(
    existingBudget?.manual_filament_cost != null,
  );
  const [manualFilamentCost, setManualFilamentCost] = useState(
    existingBudget?.manual_filament_cost?.toString() ?? '',
  );
  const [manualGrams, setManualGrams] = useState(
    existingBudget?.manual_grams?.toString() ?? '',
  );
  const [hours, setHours] = useState(existingBudget?.hours?.toString() ?? '0');
  const [minutes, setMinutes] = useState(existingBudget?.minutes?.toString() ?? '0');
  const [extraCosts, setExtraCosts] = useState(existingBudget?.extra_costs?.toString() ?? '0');
  const [marginType, setMarginType] = useState<'wholesale' | 'retail' | 'keychain'>(
    existingBudget?.margin_type ?? 'retail',
  );
  const [manualPrice, setManualPrice] = useState(
    existingBudget?.manual_price?.toString() ?? '',
  );
  const [notes, setNotes] = useState(existingBudget?.notes ?? '');

  const [preview, setPreview] = useState<BudgetResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: filaments } = useQuery<Filament[]>({
    queryKey: ['filaments'],
    queryFn: () => fetchFilaments(),
  });

  const buildPayload = useCallback((): {
    currency: 'ARS' | 'USD';
    filament_items: FilamentItemInput[];
    manual_filament_cost: number | null;
    manual_grams: number | null;
    hours: number;
    minutes: number;
    margin_type: 'wholesale' | 'retail' | 'keychain';
    extra_costs: number;
    manual_price: number | null;
    notes: string;
  } => {
    const filamentItems: FilamentItemInput[] = useManualFilament
      ? []
      : items.map((i) => ({
          product_id: i.product_id || null,
          product_name: i.product_id ? null : (i.product_name || null),
          grams: i.grams,
        }));
    return {
      currency,
      filament_items: filamentItems,
      manual_filament_cost: useManualFilament ? (parseFloat(manualFilamentCost) || null) : null,
      manual_grams: useManualFilament ? (parseFloat(manualGrams) || null) : null,
      hours: parseInt(hours) || 0,
      minutes: Math.min(parseInt(minutes) || 0, 59),
      margin_type: marginType,
      extra_costs: parseFloat(extraCosts) || 0,
      manual_price: manualPrice ? (parseFloat(manualPrice) || null) : null,
      notes: notes || '',
    };
  }, [currency, items, useManualFilament, manualFilamentCost, manualGrams, hours, minutes, marginType, extraCosts, manualPrice, notes]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setPreviewError(null);
        const payload = buildPayload();
        const result = await previewBudget(orderId, payload);
        setPreview(result);
      } catch (err) {
        setPreview(null);
        setPreviewError(err instanceof Error ? err.message : 'Error en previsualización');
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, orderId, buildPayload]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      if (existingBudget) {
        return updateBudget(orderId, payload);
      }
      return createBudget(orderId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
  });

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: null, product_name: null, grams: 100 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof FilamentItem, value: string | null | number) => {
    setItems((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const handleFilamentSelect = (index: number, filamentId: string) => {
    const filament = filaments?.find((f) => f.id === filamentId);
    updateItem(index, 'product_id', filamentId);
    updateItem(index, 'product_name', filament?.color_name ?? null);
  };

  const marginLabel = (v: string) => {
    switch (v) {
      case 'wholesale': return 'Mayorista';
      case 'retail': return 'Comercio';
      case 'keychain': return 'Llavero';
      default: return v;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {existingBudget ? 'Editar Presupuesto' : 'Generar Presupuesto'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Moneda</InputLabel>
            <Select<string>
              value={currency}
              label="Moneda"
              onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD')}
            >
              <MenuItem value="ARS">ARS ($)</MenuItem>
              <MenuItem value="USD">USD (US$)</MenuItem>
            </Select>
          </FormControl>

          {!useManualFilament && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Filamentos</Typography>
              {items.map((item, idx) => (
                <Box key={itemKey(idx)} sx={styles.filamentRow}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Producto</InputLabel>
                    <Select<string>
                      value={item.product_id ?? ''}
                      label="Producto"
                      onChange={(e) => handleFilamentSelect(idx, e.target.value)}
                    >
                      {filaments?.map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.color_name} — {f.filament_type} (${f.price_per_kg}/kg)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Gramos"
                    type="number"
                    size="small"
                    value={item.grams || ''}
                    onChange={(e) => updateItem(idx, 'grams', parseFloat(e.target.value) || 0)}
                    sx={{ width: 100 }}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <IconButton size="small" color="error" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button startIcon={<AddIcon />} size="small" onClick={addItem} sx={{ mt: 1 }}>
                Agregar filamento
              </Button>
            </Box>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={useManualFilament}
                onChange={(e) => setUseManualFilament(e.target.checked)}
              />
            }
            label="Costo manual de filamento"
          />

          {useManualFilament && (
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Costo manual de filamento"
                type="number"
                value={manualFilamentCost}
                onChange={(e) => setManualFilamentCost(e.target.value)}
                size="small"
                sx={{ width: 200 }}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Gramos"
                type="number"
                value={manualGrams}
                onChange={(e) => setManualGrams(e.target.value)}
                size="small"
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Stack>
          )}

          <Stack direction="row" spacing={2}>
            <TextField
              label="Horas"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Minutos"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              slotProps={{ htmlInput: { min: 0, max: 59 } }}
            />
          </Stack>

          <TextField
            label="Costos extra"
            type="number"
            value={extraCosts}
            onChange={(e) => setExtraCosts(e.target.value)}
            size="small"
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />

          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Tipo de margen</InputLabel>
            <Select<'wholesale' | 'retail' | 'keychain'>
              value={marginType}
              label="Tipo de margen"
              onChange={(e) => setMarginType(e.target.value as 'wholesale' | 'retail' | 'keychain')}
            >
              <MenuItem value="wholesale">Mayorista</MenuItem>
              <MenuItem value="retail">Comercio</MenuItem>
              <MenuItem value="keychain">Llavero</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Precio manual (opcional)"
            type="number"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            size="small"
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            helperText="Si se define, se usa este precio en vez del calculado"
          />

          <TextField
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            size="small"
            fullWidth
          />

          {preview && (
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Previsualización
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Filamento total</TableCell>
                    <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.filament_total.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Electricidad</TableCell>
                    <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.electricity_cost.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Amortización</TableCell>
                    <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.amortization_cost.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Margen de error ({preview.error_margin_percent}%)</TableCell>
                    <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.subtotal_with_error.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Costos extra</TableCell>
                    <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.extra_costs.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Multiplicador ({preview.margin_multiplier}x)</TableCell>
                    <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.total_before_margin.toFixed(2)}</TableCell>
                  </TableRow>
                  {preview.manual_price != null && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Precio manual</TableCell>
                      <TableCell align="right">{preview.currency === 'USD' ? 'US$' : '$'}{preview.manual_price.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Precio final</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {preview.currency === 'USD' ? 'US$' : '$'}{preview.final_price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Precio ML sugerido</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                      {preview.currency === 'USD' ? 'US$' : '$'}{preview.ml_price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}

          {previewError && (
            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              {previewError}
            </Alert>
          )}

          {saveMutation.isError && (
            <Alert severity="error">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Error al guardar'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          startIcon={saveMutation.isPending ? <CircularProgress size={18} /> : undefined}
        >
          {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
