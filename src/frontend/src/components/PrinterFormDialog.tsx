'use client';

import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPrinter,
  updatePrinter,
  fetchPrinterCatalog,
  type Printer,
  type PrinterCreate,
  type PrinterUpdate,
} from '@/app/api';
import { PrinterImage } from '@/components/PrinterImage';

const NOZZLE_PRESETS = ['0.2', '0.4', '0.6', '0.8'];

type FormState = {
  name: string;
  brand: string;
  model: string;
  nozzles: string[];
  powerWatts: string;
  lifespanHours: string;
  sparePartsCost: string;
  imageUrl: string;
  notes: string;
};

function toForm(printer?: Printer): FormState {
  return {
    name: printer?.name ?? '',
    brand: printer?.brand ?? '',
    model: printer?.model ?? '',
    nozzles: printer?.nozzle_sizes ?? [],
    powerWatts: printer?.power_watts != null ? String(printer.power_watts) : '',
    lifespanHours: printer?.lifespan_hours != null ? String(printer.lifespan_hours) : '',
    sparePartsCost: printer?.spare_parts_cost != null ? String(printer.spare_parts_cost) : '',
    imageUrl: printer?.image_url ?? '',
    notes: printer?.notes ?? '',
  };
}

export function PrinterFormDialog({
  open,
  onClose,
  printer,
}: {
  open: boolean;
  onClose: () => void;
  printer?: Printer;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(toForm(printer));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(toForm(printer));
      setError('');
    }
  }, [open, printer]);

  const { data: catalog } = useQuery({
    queryKey: ['printer-catalog'],
    queryFn: fetchPrinterCatalog,
    enabled: open,
  });

  const brands = (catalog?.brands ?? []).map((b) => b.brand);
  const models = catalog?.brands.find((b) => b.brand === form.brand)?.models ?? [];

  const isEdit = !!printer;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        nozzle_sizes: form.nozzles,
        power_watts: form.powerWatts === '' ? null : Number(form.powerWatts),
        lifespan_hours: form.lifespanHours === '' ? null : Number(form.lifespanHours),
        spare_parts_cost: form.sparePartsCost === '' ? null : Number(form.sparePartsCost),
        image_url: form.imageUrl.trim() || null,
        notes: form.notes.trim() || null,
      };
      return isEdit
        ? updatePrinter(printer.id, payload as PrinterUpdate)
        : createPrinter(payload as PrinterCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      if (printer) queryClient.invalidateQueries({ queryKey: ['printer', printer.id] });
      onClose();
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar impresora' : 'Agregar impresora'}</DialogTitle>
      <DialogContent>
        <div className="mt-1 flex flex-col gap-2">
          {error && <p className="text-sm text-error">{error}</p>}
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            fullWidth required
            error={!form.name.trim() && form.name.length > 0}
          />
          <Autocomplete
            freeSolo
            options={brands}
            value={form.brand}
            onChange={(_e, v) => {
              set({ brand: typeof v === 'string' ? v : v ?? '' });
              set({ model: '' });
            }}
            onInputChange={(_e, v) => set({ brand: v })}
            renderInput={(params) => <TextField {...params} label="Marca" />}
          />
          <Autocomplete
            freeSolo
            options={models}
            value={form.model}
            onChange={(_e, v) => set({ model: typeof v === 'string' ? v : v ?? '' })}
            onInputChange={(_e, v) => set({ model: v })}
            renderInput={(params) => (
              <TextField {...params} label="Modelo" disabled={!form.brand && models.length === 0} />
            )}
          />
          <Autocomplete
            multiple
            freeSolo
            options={NOZZLE_PRESETS}
            value={form.nozzles}
            onChange={(_e, v) => set({ nozzles: v })}
            renderTags={(value, getTagProps) =>
              value.map((v, i) => (
                <Chip label={`${v} mm`} size="small" {...getTagProps({ index: i })} key={v} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Boquillas (mm)" placeholder="Elegí o escribí un tamaño" />
            )}
          />
          <div className="flex flex-wrap gap-2">
            <TextField
              label="Potencia (W)"
              type="number"
              value={form.powerWatts}
              onChange={(e) => set({ powerWatts: e.target.value })}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
            <TextField
              label="Vida útil (h)"
              type="number"
              value={form.lifespanHours}
              onChange={(e) => set({ lifespanHours: e.target.value })}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
          </div>
          <TextField
            label="Costo repuestos / máquina"
            type="number"
            value={form.sparePartsCost}
            onChange={(e) => set({ sparePartsCost: e.target.value })}
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
          <div className="flex items-start gap-2">
            <PrinterImage
              src={form.imageUrl.trim() || null}
              alt="Vista previa"
              className="h-[120px] w-[120px] shrink-0 rounded-md"
              iconSize={48}
            />
            <div className="flex flex-grow flex-col gap-1">
              <TextField
                label="Imagen (URL)"
                value={form.imageUrl}
                onChange={(e) => set({ imageUrl: e.target.value })}
                fullWidth
                placeholder="https://..."
              />
              <Button
                size="small"
                startIcon={<DeleteIcon />}
                color="inherit"
                disabled={!form.imageUrl}
                onClick={() => set({ imageUrl: '' })}
                sx={{ alignSelf: 'flex-start' }}
              >
                Quitar imagen
              </Button>
            </div>
          </div>
          <TextField
            label="Notas"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            fullWidth multiline rows={2}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => mutation.mutate()}
          variant="contained"
          disabled={!form.name.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
