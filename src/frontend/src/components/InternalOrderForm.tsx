'use client';

import { useState, useMemo } from 'react';
import {
  TextField, Button, RadioGroup,
  FormControlLabel, Radio, Alert, CircularProgress,
  FormControl, FormLabel, Checkbox,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInternalOrder, fetchProducts, DELIVERY_TYPE_OPTIONS,
  type DeliveryType, type InternalOrderPayload, type OrderCategory,
  type Product, type LineItem,
} from '@/app/api';
import ProductSelector from '@/components/ProductSelector';

interface Props {
  onSuccess?: () => void;
}

export default function InternalOrderForm({ onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderCategory, setOrderCategory] = useState<'' | OrderCategory>('');
  const [needsPrinting, setNeedsPrinting] = useState(true);
  const [needsModelling, setNeedsModelling] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'' | DeliveryType>('');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [skipNotification, setSkipNotification] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products', { archived: false }],
    queryFn: () => fetchProducts(false),
  });

  const descriptionText = useMemo(() => {
    if (orderCategory === 'product') {
      if (lineItems.length === 0) return description.trim();
      const items = lineItems.map((item) => `${item.quantity}x ${item.name}`).join(', ');
      const desc = description.trim();
      return desc ? `${items} — ${desc}` : items;
    }
    return description.trim();
  }, [orderCategory, lineItems, description]);

  const workType = useMemo(() => {
    if (orderCategory === 'product') return 'product' as const;
    return needsPrinting ? ('impresion_3d' as const) : ('diseno_3d' as const);
  }, [orderCategory, needsPrinting]);

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

  const handleCategoryChange = (value: OrderCategory) => {
    setOrderCategory(value);
    setSubmitError(null);
    if (value === 'product') {
      setLineItems([]);
    } else {
      setNeedsPrinting(true);
      setNeedsModelling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCategory) {
      setSubmitError('Elegí una categoría para continuar.');
      return;
    }
    if (orderCategory === 'print' && !needsPrinting && !needsModelling) {
      setSubmitError('Seleccioná al menos un servicio de impresión.');
      return;
    }
    if (!deliveryType) {
      setSubmitError('Elegí el tipo de entrega.');
      return;
    }

    const payload: InternalOrderPayload = {
      customer: { name: name.trim(), email, phone },
      work_type: workType,
      description: descriptionText,
      skip_client_notification: skipNotification,
      line_items: lineItems.length > 0 ? lineItems : undefined,
      order_category: orderCategory,
      needs_3d_printing: orderCategory === 'print' && needsPrinting,
      needs_3d_modelling: orderCategory === 'print' && needsModelling,
      type_of_delivery: deliveryType,
    };
    setSubmitError(null);
    mutation.mutate(payload);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setOrderCategory('');
    setNeedsPrinting(true);
    setNeedsModelling(false);
    setDeliveryType('');
    setDescription('');
    setLineItems([]);
    setSkipNotification(false);
    setSubmitError(null);
    mutation.reset();
  };

  if (mutation.isSuccess) {
    return (
      <div className="max-w-[50rem]">
        <Alert severity="success" sx={{ mb: 2 }}>
          Pedido creado exitosamente.
        </Alert>
        <Button variant="outlined" onClick={resetForm}>
          Crear Otro
        </Button>
      </div>
    );
  }

  const canSubmit = name.trim() && email;

  return (
    <form className="max-w-[50rem]" onSubmit={handleSubmit}>
      <h3 className="mb-0.5 text-[1.25rem] font-semibold">
        Nuevo Pedido (Interno)
      </h3>
      <p className="mb-3 text-[0.8rem] text-slate">
        Registra un pedido a mano sin pasar por el formulario del cliente.
      </p>

      <div className="flex flex-col gap-2">
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
        <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />

        <FormControl>
          <FormLabel>Categoría</FormLabel>
          <RadioGroup value={orderCategory} onChange={(e) => handleCategoryChange(e.target.value as OrderCategory)}>
            <FormControlLabel value="print" control={<Radio />} label="Impresión" />
            <FormControlLabel value="product" control={<Radio />} label="Producto" />
          </RadioGroup>
        </FormControl>

        {orderCategory === 'print' && (
          <FormControl>
            <FormLabel>Servicios de impresión</FormLabel>
            <FormControlLabel
              control={<Checkbox checked={needsPrinting} onChange={(e) => setNeedsPrinting(e.target.checked)} />}
              label="3d printing"
            />
            <FormControlLabel
              control={<Checkbox checked={needsModelling} onChange={(e) => setNeedsModelling(e.target.checked)} />}
              label="3d modelling"
            />
          </FormControl>
        )}

        {orderCategory === 'product' ? (
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
                <p className="text-sm font-semibold text-slate">Resumen del pedido:</p>
                {lineItems.map((item) => (
                  <p key={item.product_id} className="text-sm text-slate">
                    {item.quantity}× {item.name} — ${(item.quantity * item.unit_price).toFixed(2)}
                  </p>
                ))}
                <p className="mt-0.5 text-sm font-bold text-slate">
                  Total: ${totalAmount.toFixed(2)}
                </p>
              </Alert>
            )}

            <TextField
              label="Notas adicionales"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </>
        ) : orderCategory === 'print' ? (
          <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} required multiline rows={4} fullWidth />
        ) : null}

        {orderCategory && (
          <FormControl>
            <FormLabel>Type of Delivery</FormLabel>
            <RadioGroup value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}>
              {DELIVERY_TYPE_OPTIONS.map((opt) => (
                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
              ))}
            </RadioGroup>
          </FormControl>
        )}

        <FormControlLabel control={<Checkbox checked={skipNotification} onChange={(e) => setSkipNotification(e.target.checked)} />} label="Cliente ya notificado (no enviar email)" />

        {submitError && (
          <Alert severity="error">{submitError}</Alert>
        )}

        {mutation.isError && (
          <Alert severity="error">
            {mutation.error instanceof Error ? mutation.error.message : 'Error al crear el pedido'}
          </Alert>
        )}

        <Button type="submit" variant="contained" size="large" fullWidth disabled={!canSubmit || mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={20} /> : undefined}>
          {mutation.isPending ? 'Creando...' : 'Crear Pedido'}
        </Button>
      </div>
    </form>
  );
}
