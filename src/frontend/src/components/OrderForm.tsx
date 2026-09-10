'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TextField, Button, RadioGroup,
  FormControlLabel, Radio, Alert, CircularProgress,
  FormControl, FormLabel, Checkbox,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createPublicOrder, fetchPublicProducts, DELIVERY_TYPE_OPTIONS,
  type DeliveryType, type FileInfo, type LineItem, type OrderCategory,
} from '@/app/api';
import ProductSelector from '@/components/ProductSelector';
import { FlayerLogo } from '@/components/FlayerLogo';

export default function OrderForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderCategory, setOrderCategory] = useState<'' | OrderCategory>('');
  const [needsPrinting, setNeedsPrinting] = useState(true);
  const [needsModelling, setNeedsModelling] = useState(false);
  const [dimensions, setDimensions] = useState('');
  const [deliveryType, setDeliveryType] = useState<'' | DeliveryType>('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['public-products', token],
    queryFn: () => fetchPublicProducts(token),
    enabled: orderCategory === 'product',
  });

  const descriptionText = useMemo(() => {
    if (orderCategory === 'product') {
      if (lineItems.length === 0) return '';
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

  const mutation = useMutation({
    mutationFn: (data: {
      customer: { name: string; email: string; phone: string };
      work_type: 'impresion_3d' | 'diseno_3d' | 'product';
      description: string;
      token?: string;
      files?: FileInfo[];
      line_items?: LineItem[];
      order_category: OrderCategory;
      needs_3d_printing: boolean;
      needs_3d_modelling: boolean;
      dimensions?: string | null;
      type_of_delivery: DeliveryType;
    }) => createPublicOrder(data),
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

    const files: FileInfo[] | undefined =
      fileUrl && fileName ? [{ filename: fileName, url: fileUrl }] : undefined;

    setSubmitError(null);
    mutation.mutate({
      customer: { name: name.trim(), email, phone },
      work_type: workType,
      description: descriptionText,
      token,
      files,
      line_items: lineItems.length > 0 ? lineItems : undefined,
      order_category: orderCategory,
      needs_3d_printing: orderCategory === 'print' && needsPrinting,
      needs_3d_modelling: orderCategory === 'print' && needsModelling,
      dimensions: dimensions.trim() || null,
      type_of_delivery: deliveryType,
    });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setOrderCategory('');
    setNeedsPrinting(true);
    setNeedsModelling(false);
    setDimensions('');
    setDeliveryType('');
    setDescription('');
    setFileUrl('');
    setFileName('');
    setLineItems([]);
    setSubmitError(null);
    mutation.reset();
  };

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  );

  if (!token) {
    return (
      <div className="mx-auto max-w-[56.25rem] p-4">
        <div className="card rounded-lg border border-line bg-snow p-6 sm:p-8">
          <FlayerLogo size={28} />
          <p className="mb-2 mt-4 font-mono text-xs font-medium uppercase tracking-widest text-primary">
            Enlace privado
          </p>
          <h1 className="text-[1.5rem] font-semibold tracking-tight">
            Este formulario se comparte de forma privada
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate">
            El taller comparte el formulario de pedido con sus clientes mediante
            un enlace con token. Si llegaste aquí sin ese enlace, pídele al
            taller el enlace para realizar tu pedido.
          </p>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-[56.25rem] p-4">
        <Alert severity="success" sx={{ mb: 2 }}>
          ¡Pedido recibido! Te contactaremos pronto.
        </Alert>
        <Button variant="outlined" onClick={resetForm}>Nuevo Pedido</Button>
      </div>
    );
  }

  return (
    <form className="mx-auto max-w-[56.25rem] p-4" onSubmit={handleSubmit}>
      <h1 className="mb-2 text-[2.125rem] font-semibold">
        Solicitar Pedido
      </h1>

      <div className="flex flex-col gap-3">
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
            <RadioGroup aria-label="Servicios de impresión">
              <FormControlLabel
                control={<Checkbox checked={needsPrinting} onChange={(e) => setNeedsPrinting(e.target.checked)} />}
                label="3d printing"
              />
              <FormControlLabel
                control={<Checkbox checked={needsModelling} onChange={(e) => setNeedsModelling(e.target.checked)} />}
                label="3d modelling"
              />
            </RadioGroup>
          </FormControl>
        )}

        {orderCategory && (
          <>
            {orderCategory === 'product' ? (
              <>
                {productsQuery.isLoading ? (
                  <div className="flex justify-center p-4">
                    <CircularProgress />
                  </div>
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
            ) : (
              <TextField
                label="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                multiline
                rows={4}
                fullWidth
              />
            )}

            <TextField
              label="Dimensions"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              helperText="largo x ancho x alto en mm (De la pieza mas grande)"
              fullWidth
            />

            <FormControl>
              <FormLabel>Type of Delivery</FormLabel>
              <RadioGroup value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}>
                {DELIVERY_TYPE_OPTIONS.map((opt) => (
                  <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
                ))}
              </RadioGroup>
            </FormControl>

            <p className="text-sm font-medium text-slate">
              Archivo (opcional) — Enlace a Drive, WeTransfer, etc.
            </p>
            <div className="flex flex-wrap gap-2">
              <TextField label="Nombre del archivo" value={fileName} onChange={(e) => setFileName(e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label="URL del archivo" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} size="small" sx={{ flex: 2 }} />
            </div>
          </>
        )}

        {submitError && (
          <Alert severity="error">{submitError}</Alert>
        )}

        {mutation.isError && (
          <Alert severity="error">
            {mutation.error instanceof Error ? mutation.error.message : 'Error al crear el pedido'}
          </Alert>
        )}

        <Button type="submit" variant="contained" size="large" disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={20} /> : undefined}>
          {mutation.isPending ? 'Enviando...' : 'Enviar Pedido'}
        </Button>
      </div>
    </form>
  );
}