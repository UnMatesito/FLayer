'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box, TextField, Button, Typography, RadioGroup,
  FormControlLabel, Radio, Stack, Alert, CircularProgress,
  FormControl, FormLabel,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createPublicOrder, fetchPublicProducts, type FileInfo, type LineItem } from '@/app/api';
import ProductSelector from '@/components/ProductSelector';

const styles: Record<string, SxProps<Theme>> = {
  container: { maxWidth: 900, mx: 'auto', p: 4 },
  field: { width: '100%' },
};

export default function OrderForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState<'impresion_3d' | 'diseno_3d' | 'product'>('impresion_3d');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const productsQuery = useQuery({
    queryKey: ['public-products', token],
    queryFn: () => fetchPublicProducts(token),
    enabled: workType === 'product',
  });

  const descriptionText = useMemo(() => {
    if (workType === 'product') {
      if (lineItems.length === 0) return '';
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

  const mutation = useMutation({
    mutationFn: (data: {
      customer: { name: string; email: string; phone: string };
      work_type: 'impresion_3d' | 'diseno_3d' | 'product';
      description: string;
      token?: string;
      files?: FileInfo[];
      line_items?: LineItem[];
    }) => createPublicOrder(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const files: FileInfo[] | undefined =
      fileUrl && fileName ? [{ filename: fileName, url: fileUrl }] : undefined;

    mutation.mutate({
      customer: { name: name.trim(), email, phone },
      work_type: workType,
      description: descriptionText,
      token,
      files,
      line_items: lineItems.length > 0 ? lineItems : undefined,
    });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setWorkType('impresion_3d');
    setDescription('');
    setFileUrl('');
    setFileName('');
    setLineItems([]);
    mutation.reset();
  };

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  );

  if (mutation.isSuccess) {
    return (
      <Box sx={styles.container}>
        <Alert severity="success" sx={{ mb: 2 }}>
          ¡Pedido recibido! Te contactaremos pronto.
        </Alert>
        <Button variant="outlined" onClick={resetForm}>Nuevo Pedido</Button>
      </Box>
    );
  }

  return (
    <Box sx={styles.container} component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Solicitar Pedido
      </Typography>

      <Stack spacing={3}>
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
            {productsQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : productsQuery.isError ? (
              <Alert severity="error">Error al cargar productos. Intenta de nuevo.</Alert>
            ) : productsQuery.data && productsQuery.data.length > 0 ? (
              <ProductSelector
                products={productsQuery.data}
                lineItems={lineItems}
                selectedIds={selectedIds}
                onAdd={addProduct}
                onUpdateQuantity={updateQuantity}
                onRemove={removeProduct}
              />
            ) : (
              <Alert severity="info">No hay productos disponibles en este momento.</Alert>
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
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            multiline
            rows={4}
            sx={styles.field}
          />
        )}

        <Typography variant="subtitle2" color="text.secondary">
          Archivo (opcional) — Enlace a Drive, WeTransfer, etc.
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField label="Nombre del archivo" value={fileName} onChange={(e) => setFileName(e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="URL del archivo" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} size="small" sx={{ flex: 2 }} />
        </Stack>

        {mutation.isError && (
          <Alert severity="error">
            {mutation.error instanceof Error ? mutation.error.message : 'Error al crear el pedido'}
          </Alert>
        )}

        <Button type="submit" variant="contained" size="large" disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={20} /> : undefined}>
          {mutation.isPending ? 'Enviando...' : 'Enviar Pedido'}
        </Button>
      </Stack>
    </Box>
  );
}
