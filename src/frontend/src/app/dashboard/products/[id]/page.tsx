'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, Alert, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArchiveIcon from '@mui/icons-material/Archive';
import UploadIcon from '@mui/icons-material/Upload';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProduct, updateProduct, deleteProduct, uploadProductImage,
  fetchProductStockMovements, adjustProductStock,
  type Product, type ProductUpdate, type ProductStockMovement,
} from '@/app/api';

function EditProductDialog({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductUpdate>({
    name: product.name,
    price: product.price,
    description: product.description,
    stock_quantity: product.stock_quantity,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => updateProduct(product.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Producto</DialogTitle>
      <DialogContent>
        <div className="mt-1 flex flex-col gap-2">
          {error && <p className="text-sm text-error">{error}</p>}
          <TextField
            label="Nombre"
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth required
          />
          <TextField
            label="Precio"
            type="number"
            value={form.price ?? ''}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            fullWidth required
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
          <TextField
            label="Descripción"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth multiline rows={3}
          />
          <TextField
            label="Stock"
            type="number"
            value={form.stock_quantity ?? ''}
            onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.name?.trim() || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AdjustStockDialog({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product }) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (vars: { delta: number; notes: string | null }) =>
      adjustProductStock(product.id, { delta_quantity: vars.delta, notes: vars.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stock-movements', product.id] });
      onClose();
      setDelta('');
      setNotes('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ajustar Stock</DialogTitle>
      <DialogContent>
        <div className="mt-1 flex flex-col gap-2">
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Delta"
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            fullWidth required
            helperText={`Positivo para agregar, negativo para restar. Stock actual: ${product.stock_quantity}`}
          />
          <TextField
            label="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth multiline rows={2}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate({ delta: Number(delta), notes: notes || null })}
          variant="contained" disabled={!delta || mutation.isPending}>
          {mutation.isPending ? 'Ajustando...' : 'Ajustar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function movementTypeColor(type: string) {
  switch (type) {
    case 'consumption': return 'error' as const;
    case 'adjustment': return 'info' as const;
    case 'reversal': return 'success' as const;
    default: return 'default' as const;
  }
}

function movementTypeLabel(type: string) {
  switch (type) {
    case 'consumption': return 'Consumo';
    case 'adjustment': return 'Ajuste';
    case 'reversal': return 'Reversión';
    default: return type;
  }
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });

  const { data: movements } = useQuery<ProductStockMovement[]>({
    queryKey: ['product-stock-movements', id],
    queryFn: () => fetchProductStockMovements(id),
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      router.push('/dashboard/products');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => updateProduct(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedFile(null);
      setUploadError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  if (error || !product) {
    return (
      <div>
        <Alert severity="error">{error instanceof Error ? error.message : 'Producto no encontrado'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>Volver</Button>
      </div>
    );
  }

  return (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>Volver</Button>

      <div className="mb-3 card rounded-md border border-line bg-snow p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-[1.5rem] font-semibold">{product.name}</h2>
            {product.description && (
              <p className="mt-0.5 text-sm text-slate">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="small" variant="outlined" onClick={() => setEditDialog(true)}>Editar</Button>
            {product.is_active ? (
              <Button size="small" variant="outlined" color="error" startIcon={<ArchiveIcon />}
                onClick={() => { if (confirm('¿Archivar este producto?')) archiveMutation.mutate(); }}>
                Archivar
              </Button>
            ) : (
              <Button size="small" variant="outlined" color="success" onClick={() => restoreMutation.mutate()}>
                Activar
              </Button>
            )}
          </div>
        </div>

        <hr className="mb-3 border-line" />

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          <div>
            <p className="mb-0.5 text-xs text-slate">Precio</p>
            <p className="font-medium">${Number(product.price).toFixed(2)}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Stock</p>
            <div className="font-medium">
              {product.stock_quantity}
              {product.stock_quantity < 1 && (
                <Chip label="Sin stock" size="small" color="warning" sx={{ ml: 1 }} />
              )}
            </div>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Estado</p>
            <Chip label={product.is_active ? 'Activo' : 'Archivado'} size="small" color={product.is_active ? 'success' : 'default'} />
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Creado</p>
            <p className="font-medium">{new Date(product.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-slate">Actualizado</p>
            <p className="font-medium">{new Date(product.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="mb-3 card rounded-md border border-line bg-snow p-4">
        <h3 className="mb-2 text-[1.25rem] font-semibold">Imagen</h3>
        <hr className="mb-2 border-line" />
        {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

        <div className="flex items-center gap-3">
          {product.image_url ? (
            <Avatar src={product.image_url} alt={product.name} variant="rounded" sx={{ width: 160, height: 160 }} />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-md border-2 border-dashed border-line bg-plate">
              <p className="text-sm text-slate">Sin imagen</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
              {product.image_url ? 'Reemplazar imagen' : 'Subir imagen'}
              <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(''); }} />
            </Button>
            {selectedFile && (
              <p className="text-xs text-slate">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
            {selectedFile && (
              <Button variant="contained" size="small" onClick={() => uploadMutation.mutate(selectedFile)}
                disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Subiendo...' : 'Confirmar subida'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 card rounded-md border border-line bg-snow p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[1.25rem] font-semibold">Stock</h3>
          <Button size="small" variant="outlined" onClick={() => setAdjustDialog(true)}>Ajustar stock</Button>
        </div>
        <hr className="mb-2 border-line" />

        {movements && movements.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>Orden</TableCell>
                  <TableCell>Notas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={movementTypeLabel(m.movement_type)} size="small" color={movementTypeColor(m.movement_type)} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: m.quantity < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </TableCell>
                    <TableCell>{m.order_id ? m.order_id.slice(0, 8) + '...' : '-'}</TableCell>
                    <TableCell>{m.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <p className="text-sm text-slate">Sin movimientos de stock registrados.</p>
        )}
      </div>

      <EditProductDialog open={editDialog} onClose={() => setEditDialog(false)} product={product} />
      <AdjustStockDialog open={adjustDialog} onClose={() => setAdjustDialog(false)} product={product} />
    </div>
  );
}
