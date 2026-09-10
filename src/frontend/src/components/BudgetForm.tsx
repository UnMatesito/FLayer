'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, IconButton,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  CircularProgress, Alert, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFilaments, createBudget, updateBudget, previewBudget, fetchPrinters,
  CURRENCY_OPTIONS, currencySymbol, MACHINE_DEFAULT_FALLBACKS, BUDGET_MARGIN_OPTIONS,
  type Currency,
  type BudgetMarginType, type BudgetResponse, type FilamentItemInput, type Filament, type Printer,
} from '@/app/api';
import { useAuth } from '@/app/auth-context';
import { normalizeApiError, normalizeBudgetMarginError } from '@/app/error-normalizer';

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

function itemKey(index: number) {
  return `item-${index}`;
}

function marginTypeFor(multiplier: number): BudgetMarginType {
  return BUDGET_MARGIN_OPTIONS.find((option) => option.multiplier === multiplier)?.value ?? 'custom';
}

export default function BudgetForm({ open, onClose, orderId, existingBudget }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>(existingBudget?.currency ?? user?.currency ?? 'ARS');
  const [printerId, setPrinterId] = useState(existingBudget?.printer_id ?? '');
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
  const [assemblyCost, setAssemblyCost] = useState(existingBudget?.assembly_cost?.toString() ?? '0');
  const [sandingCost, setSandingCost] = useState(existingBudget?.sanding_cost?.toString() ?? '0');
  const [paintingCost, setPaintingCost] = useState(existingBudget?.painting_cost?.toString() ?? '0');
  const [postProcessingEnabled, setPostProcessingEnabled] = useState(
    Boolean((existingBudget?.assembly_cost ?? 0) || (existingBudget?.sanding_cost ?? 0) || (existingBudget?.painting_cost ?? 0)),
  );
  const [marginMultiplier, setMarginMultiplier] = useState(existingBudget?.margin_multiplier?.toString() ?? '4');
  const [manualPrice, setManualPrice] = useState(
    existingBudget?.manual_price?.toString() ?? '',
  );
  const [notes, setNotes] = useState(existingBudget?.notes ?? '');

  const [preview, setPreview] = useState<BudgetResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [marginError, setMarginError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: filaments } = useQuery<Filament[]>({
    queryKey: ['filaments'],
    queryFn: () => fetchFilaments(),
  });

  const { data: printers } = useQuery<Printer[]>({
    queryKey: ['printers'],
    queryFn: () => fetchPrinters(),
  });

  const buildPayload = useCallback((): {
    currency: Currency;
    printer_id: string | null;
    filament_items: FilamentItemInput[];
    manual_filament_cost: number | null;
    manual_grams: number | null;
    hours: number;
    minutes: number;
    margin_type: BudgetMarginType;
    margin_multiplier: number | null;
    extra_costs: number;
    assembly_cost: number;
    sanding_cost: number;
    painting_cost: number;
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
    const parsedMargin = parseFloat(marginMultiplier);
    const effectiveMargin = Number.isFinite(parsedMargin) && parsedMargin > 0 ? parsedMargin : 0;
    return {
      currency,
      printer_id: printerId || null,
      filament_items: filamentItems,
      manual_filament_cost: useManualFilament ? (parseFloat(manualFilamentCost) || null) : null,
      manual_grams: useManualFilament ? (parseFloat(manualGrams) || null) : null,
      hours: parseInt(hours) || 0,
      minutes: Math.min(parseInt(minutes) || 0, 59),
      margin_type: marginTypeFor(effectiveMargin),
      margin_multiplier: effectiveMargin || null,
      extra_costs: parseFloat(extraCosts) || 0,
      assembly_cost: postProcessingEnabled ? (parseFloat(assemblyCost) || 0) : 0,
      sanding_cost: postProcessingEnabled ? (parseFloat(sandingCost) || 0) : 0,
      painting_cost: postProcessingEnabled ? (parseFloat(paintingCost) || 0) : 0,
      manual_price: manualPrice ? (parseFloat(manualPrice) || null) : null,
      notes: notes || '',
    };
  }, [currency, printerId, items, useManualFilament, manualFilamentCost, manualGrams, hours, minutes, marginMultiplier, extraCosts, postProcessingEnabled, assemblyCost, sandingCost, paintingCost, manualPrice, notes]);

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
        setPreviewError(normalizeApiError(err, 'Error en previsualización'));
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
    onError: (err: unknown) => setPreviewError(normalizeApiError(err, 'No se pudo guardar el presupuesto')),
  });

  const submitBudget = () => {
    const parsed = Number(marginMultiplier);
    if (!marginMultiplier.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      const message = normalizeBudgetMarginError({ detail: [{ loc: ['body', 'margin_multiplier'], msg: 'invalid' }] });
      setMarginError(message);
      setPreviewError(message);
      return;
    }
    setMarginError(null);
    saveMutation.mutate();
  };

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

  const parsedMargin = parseFloat(marginMultiplier);
  const selectedMarginOption = BUDGET_MARGIN_OPTIONS.find((option) => option.multiplier === parsedMargin);
  const handlePostProcessingToggle = (enabled: boolean) => {
    setPostProcessingEnabled(enabled);
    if (!enabled) {
      setAssemblyCost('0');
      setSandingCost('0');
      setPaintingCost('0');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {existingBudget ? 'Editar presupuesto' : 'Generar presupuesto'}
      </DialogTitle>
      <DialogContent>
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <FormControl size="small" sx={{ width: 150 }}>
              <InputLabel>Moneda</InputLabel>
              <Select<string>
                value={currency}
                label="Moneda"
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Impresora</InputLabel>
              <Select<string>
                value={printerId}
                label="Impresora"
                onChange={(e) => setPrinterId(e.target.value)}
              >
                <MenuItem value="">Sin impresora (valores por defecto)</MenuItem>
                {printers?.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {!useManualFilament && (
            <div>
              <p className="mb-1 text-sm font-medium">Filamentos</p>
              {items.map((item, idx) => (
                <div key={itemKey(idx)} className="flex flex-wrap items-center gap-2">
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
                </div>
              ))}
              <Button startIcon={<AddIcon />} size="small" onClick={addItem} sx={{ mt: 1 }}>
                Agregar filamento
              </Button>
            </div>
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
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          )}

          <div className="flex gap-2">
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
          </div>

          <TextField
            label="Costos extra"
            type="number"
            value={extraCosts}
            onChange={(e) => setExtraCosts(e.target.value)}
            size="small"
            sx={{ width: 200 }}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />

          <div className="rounded-md border border-line p-2">
            <FormControlLabel
              control={
                <Switch
                  checked={postProcessingEnabled}
                  onChange={(e) => handlePostProcessingToggle(e.target.checked)}
                />
              }
              label="Requiere post-procesado"
            />
            {postProcessingEnabled && (
              <div className="mt-1 flex flex-wrap gap-2">
                <TextField
                  label="Ensamble"
                  type="number"
                  value={assemblyCost}
                  onChange={(e) => setAssemblyCost(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
                <TextField
                  label="Lijado"
                  type="number"
                  value={sandingCost}
                  onChange={(e) => setSandingCost(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
                <TextField
                  label="Pintura / barniz"
                  type="number"
                  value={paintingCost}
                  onChange={(e) => setPaintingCost(e.target.value)}
                  size="small"
                  sx={{ width: 170 }}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border border-line p-2">
            <p className="mb-2 text-sm font-medium">Margen de ganancia</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {BUDGET_MARGIN_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="small"
                  variant={parsedMargin === option.multiplier ? 'contained' : 'outlined'}
                  onClick={() => setMarginMultiplier(String(option.multiplier))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <TextField
              label="Multiplicador"
              type="number"
              value={marginMultiplier}
              onChange={(e) => { setMarginMultiplier(e.target.value); setMarginError(null); }}
              size="small"
              sx={{ width: 240 }}
              slotProps={{ htmlInput: { min: 0.01, max: 100, step: 0.1 } }}
              error={!!marginError}
              helperText={marginError ?? 'Los botones son referencias; otros valores válidos se usan como personalizado.'}
            />
            <p className="mt-1 text-xs text-slate">
              Referencia: {selectedMarginOption ? `${selectedMarginOption.label} ${selectedMarginOption.reference}` : 'Personalizado'}
            </p>
          </div>

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
            <div className="rounded-md bg-canvas p-2">
              <p className="mb-1 text-sm font-semibold">
                Previsualización
              </p>
              <p className="mb-1 text-xs text-slate">
                {preview.printer_name ? `Impresora: ${preview.printer_name}` : 'Parámetros por defecto'}
                {' — '}{preview.power_watts?.toFixed(0) ?? '120'}W, {preview.lifespan_hours?.toFixed(0) ?? MACHINE_DEFAULT_FALLBACKS[preview.currency].lifespan_hours}h,
                repuestos {currencySymbol(preview.currency)}{preview.spare_parts_cost?.toFixed(2) ?? '150000.00'}
              </p>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Filamento total</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.filament_total.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Electricidad</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.electricity_cost.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Amortización</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.amortization_cost.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Margen de error ({preview.error_margin_percent}%)</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.subtotal_with_error.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Costos extra</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.extra_costs.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Post-procesado</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.post_processing_total.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Multiplicador ({preview.margin_multiplier}x)</TableCell>
                    <TableCell align="right">{currencySymbol(preview.currency)}{preview.total_before_margin.toFixed(2)}</TableCell>
                  </TableRow>
                  {preview.manual_price != null && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Precio manual</TableCell>
                      <TableCell align="right">{currencySymbol(preview.currency)}{preview.manual_price.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Precio final pieza</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {currencySymbol(preview.currency)}{preview.final_price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
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
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submitBudget}
          disabled={saveMutation.isPending}
          startIcon={saveMutation.isPending ? <CircularProgress size={18} /> : undefined}
        >
          {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
