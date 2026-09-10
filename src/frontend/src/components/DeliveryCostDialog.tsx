'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDeliveryCost } from '@/app/api';

interface Props {
  open: boolean;
  orderId: string;
  initialEmbalaje?: number | null;
  initialPrecioEnvio?: number | null;
  onClose: () => void;
}

export default function DeliveryCostDialog({
  open,
  orderId,
  initialEmbalaje = null,
  initialPrecioEnvio = null,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [embalaje, setEmbalaje] = useState('');
  const [precioEnvio, setPrecioEnvio] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmbalaje(initialEmbalaje == null ? '' : String(initialEmbalaje));
      setPrecioEnvio(initialPrecioEnvio == null ? '' : String(initialPrecioEnvio));
      setError(null);
    }
  }, [open, initialEmbalaje, initialPrecioEnvio]);

  const mutation = useMutation({
    mutationFn: (payload: { embalaje: number; precio_envio: number }) =>
      updateDeliveryCost(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      onClose();
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const emb = Number(embalaje);
    const envio = Number(precioEnvio);
    if (
      embalaje.trim() === '' || precioEnvio.trim() === ''
      || !Number.isFinite(emb) || !Number.isFinite(envio)
      || emb < 0 || envio < 0
    ) {
      setError('Ingresá valores numéricos válidos (mayores o iguales a 0).');
      return;
    }
    setError(null);
    mutation.mutate({ embalaje: emb, precio_envio: envio });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSave}>
        <DialogTitle>Agregar costo de Entrega</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-3 pt-1">
            <TextField
              label="embalaje"
              type="number"
              inputMode="decimal"
              value={embalaje}
              onChange={(e) => setEmbalaje(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <TextField
              label="Precio Envio"
              type="number"
              inputMode="decimal"
              value={precioEnvio}
              onChange={(e) => setPrecioEnvio(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            {error && !mutation.isPending && (
              <Alert severity="error">{error}</Alert>
            )}
            {mutation.isError && (
              <Alert severity="error">
                {mutation.error instanceof Error ? mutation.error.message : 'Error al guardar el costo de entrega'}
              </Alert>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}