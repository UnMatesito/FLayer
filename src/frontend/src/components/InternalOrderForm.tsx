'use client';

import { useState, useMemo } from 'react';
import {
  Box, TextField, Button, Typography, RadioGroup,
  FormControlLabel, Radio, Stack, Alert, CircularProgress,
  FormControl, FormLabel, Checkbox,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInternalOrder, fetchProducts, type InternalOrderPayload, type Product, type LineItem } from '@/app/api';
import ProductSelector from '@/components/ProductSelector';

const styles: Record<string, SxProps<Theme>> = {
  container: { maxWidth: 800 },
  field: { width: '100%' },
};

interface Props {
  onSuccess?: () => void;
}

export default function InternalOrderForm({ onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState<'impresion_3d' | 'diseno_3d' | 'product'>('impresion_3d');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [skipNotification, setSkipNotification] = useState(false);

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products', { archived: false }],
    queryFn: () => fetchProducts(false),
  });

  const descriptionText = useMemo(() => {
    if (workType === 'product') {
      if (lineItems.length === 0) return description.trim();
      const items = lineItems.map((item) => `${item.quantity}x ${item.name}`).join(', ');
      const desc = description.trim();
      return desc ? `${items} — ${desc}` : items;
    }
    return description.trim();
  }, [workType, lineItems, description]);

  const addProduct = (product: { id: string; name: string; price: number; stock_quantity: number }) => {
    setLineItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) }
            : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.price }];
    });
  };

  const updateQuantity = (productId: string, quantity: number, maxStock: number) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, maxStock)) }
          : item
      ).filter((item) => item.quantity > 0)
    );
  };

  const removeProduct = (productId: string) => {
    setLineItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const selectedIds = new Set(lineItems.map((item) => item.product_id));

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  );

  const mutation = useMutation({
    mutationFn: (data: InternalOrderPayload) =>
      createInternalOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: InternalOrderPayload = {
      customer: { name: name.trim(), email, phone },
      work_type: workType,
      description: descriptionText,
      skip_client_notification: skipNotification,
      line_items: lineItems.length > 0 ? lineItems : undefined,
    };
    mutation.mutate(payload);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setWorkType('impresion_3d');
    setDescription('');
    setLineItems([]);
    setSkipNotification(false);
    mutation.reset();
  };

  if (mutation.isSuccess) {
    return (
      <Box sx={styles.container}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Pedido creado exitosamente.
        </Alert>
        <Button variant="outlined" onClick={resetForm}>
          Crear Otro
        </Button>
      </Box>
    );
  }

  const canSubmit = name.trim() && email;

  return (
    <Box sx={styles.container} component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Nuevo Pedido (Interno)
      </Typography>

      <Stack spacing={2}>
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required sx={styles.field} />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required sx={styles.field} />
        <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} sx={styles.field} />

        <FormControl>
          <FormLabel>Tipo de trabajo</FormLabel>
          <RadioGroup value={workType} onChange={(e) => {
            setWorkType(e.target.value as 'impresion_3d' | 'diseno_3d' | 'product');
            setLineItems([]);
          }}>
            <FormControlLabel value="impresion_3d" control={<Radio />} label="Impresión 3D" />
            <FormControlLabel value="diseno_3d" control={<Radio />} label="Diseño 3D" />
            <FormControlLabel value="product" control={<Radio />} label="Producto" />
          </RadioGroup>
        </FormControl>

        {workType === 'product' ? (
          <>
            {products && products.length > 0 ? (
              <ProductSelector
                products={products}
                lineItems={lineItems}
                selectedIds={selectedIds}
                onAdd={addProduct}
                onUpdateQuantity={updateQuantity}
                onRemove={removeProduct}
              />
            ) : (
              <Alert severity="info">No hay productos activos.</Alert>
            )}

            {lineItems.length > 0 && (
              <Alert severity="info" icon={false}>
                <Typography variant="body2" fontWeight={600}>Resumen del pedido:</Typography>
                {lineItems.map((item) => (
                  <Typography key={item.product_id} variant="body2">
                    {item.quantity}× {item.name} — ${(item.quantity * item.unit_price).toFixed(2)}
                  </Typography>
                ))}
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                  Total: ${totalAmount.toFixed(2)}
                </Typography>
              </Alert>
            )}

            <TextField
              label="Notas adicionales"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              sx={styles.field}
            />
          </>
        ) : (
          <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} required multiline rows={4} sx={styles.field} />
        )}

        <FormControlLabel control={<Checkbox checked={skipNotification} onChange={(e) => setSkipNotification(e.target.checked)} />} label="Cliente ya notificado (no enviar email)" />

        {mutation.isError && (
          <Alert severity="error">
            {mutation.error instanceof Error ? mutation.error.message : 'Error al crear el pedido'}
          </Alert>
        )}

        <Button type="submit" variant="contained" size="large" disabled={!canSubmit || mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={20} /> : undefined}>
          {mutation.isPending ? 'Creando...' : 'Crear Pedido'}
        </Button>
      </Stack>
    </Box>
  );
}
