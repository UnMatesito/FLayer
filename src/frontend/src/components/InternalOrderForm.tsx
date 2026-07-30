'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  Checkbox,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import type { SxProps, Theme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInternalOrder, fetchProducts, type InternalOrderPayload, type Product, type LineItem } from '@/app/api';

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

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  );

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
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
                {products.filter((p) => p.is_active).map((product) => {
                  const inCart = selectedIds.has(product.id);
                  const cartItem = lineItems.find((item) => item.product_id === product.id);
                  const outOfStock = product.stock_quantity < 1;
                  return (
                    <Card key={product.id} variant="outlined" sx={{
                      opacity: outOfStock ? 0.5 : 1,
                      border: inCart ? '2px solid' : undefined,
                      borderColor: inCart ? 'primary.main' : undefined,
                    }}>
                      <CardMedia
                        component="img"
                        height="120"
                        image={product.image_url || '/placeholder.svg'}
                        alt={product.name}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ pb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {product.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Typography variant="h6" color="primary" fontWeight={700}>
                            ${Number(product.price).toFixed(2)}
                          </Typography>
                          <Chip
                            label={outOfStock ? 'Sin stock' : `${product.stock_quantity} uds.`}
                            size="small"
                            color={product.stock_quantity <= 3 ? 'warning' : 'default'}
                          />
                        </Stack>
                        {outOfStock ? (
                          <Button variant="outlined" disabled size="small" sx={{ mt: 1 }} fullWidth>
                            Sin stock
                          </Button>
                        ) : inCart && cartItem ? (
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(product.id, cartItem.quantity - 1, product.stock_quantity)}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <TextField
                              type="number"
                              size="small"
                              value={cartItem.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) updateQuantity(product.id, val, product.stock_quantity);
                              }}
                              slotProps={{
                                input: {
                                  sx: { width: 60, textAlign: 'center' },
                                  startAdornment: <InputAdornment position="start">×</InputAdornment>,
                                },
                              }}
                              sx={{ '& .MuiInputBase-input': { textAlign: 'center' } }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeProduct(product.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => addProduct(product)}
                            sx={{ mt: 1 }}
                            fullWidth
                          >
                            Agregar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
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
