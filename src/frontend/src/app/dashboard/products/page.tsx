'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  type Product, type ProductCreate,
} from '@/app/api';

function AddProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductCreate>({ name: '', price: 0, description: '', stock_quantity: 0 });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createProduct(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
      setForm({ name: '', price: 0, description: '', stock_quantity: 0 });
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Agregar producto</DialogTitle>
      <DialogContent>
        <div className="mt-1 flex flex-col gap-2">
          {error && <p className="text-sm text-error">{error}</p>}
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth required error={!form.name.trim() && form.name.length > 0} />
          <TextField label="Precio" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            fullWidth required slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
          <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth multiline rows={3} />
          <TextField label="Stock inicial" type="number" value={form.stock_quantity}
            onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
            fullWidth slotProps={{ htmlInput: { min: 0, step: 1 } }} />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProductCard({ product, onArchive, onRestore, showArchived }: {
  product: Product; onArchive: (id: string) => void; onRestore: (id: string) => void; showArchived: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden card rounded-md border border-line bg-snow transition-colors hover:border-slate/60"
      onClick={() => router.push(`/dashboard/products/${product.id}`)}
    >
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="h-[180px] w-full object-cover" />
      ) : (
        <div className="flex h-[180px] items-center justify-center bg-plate">
          <Inventory2Icon sx={{ fontSize: 60 }} className="text-slate" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-2 pb-0">
        <div className="mb-0.5 flex items-start justify-between gap-1">
          <h3 className="text-[1.25rem] font-semibold leading-[1.2]">{product.name}</h3>
          <Chip label={product.is_active ? 'Activo' : 'Archivado'} size="small"
            color={product.is_active ? 'success' : 'default'} className="flex-shrink-0" />
        </div>
        {product.description && (
          <p className="mb-1 line-clamp-2 text-[0.85rem] text-slate">{product.description}</p>
        )}
        <div className="flex flex-wrap items-baseline gap-3">
          <div>
            <p className="text-xs text-slate">Precio</p>
            <p className="text-[1.25rem] font-bold">${Number(product.price).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate">Stock</p>
            <p className={`text-[0.9rem] font-semibold ${product.stock_quantity < 1 ? 'text-[var(--mui-palette-warning-main)]' : 'text-[var(--mui-palette-success-main)]'}`}>
              {product.stock_quantity} {product.stock_quantity === 1 ? 'unidad' : 'uds.'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 pb-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-slate">
          {new Date(product.created_at).toLocaleDateString()}
        </p>
        {showArchived ? (
          <IconButton size="small" color="primary" title="Restaurar" onClick={() => onRestore(product.id)}>
            <UnarchiveIcon />
          </IconButton>
        ) : (
          <IconButton size="small" color="error" title="Archivar"
            onClick={() => { if (confirm('¿Archivar este producto?')) onArchive(product.id); }}>
            <ArchiveIcon />
          </IconButton>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', { archived: showArchived }],
    queryFn: () => fetchProducts(showArchived),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateProduct(id, { is_active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  const visible = showArchived
    ? products?.filter((p) => !p.is_active) ?? []
    : products?.filter((p) => p.is_active) ?? [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
        <h2 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">
          {showArchived ? 'Productos archivados' : 'Productos'}
        </h2>
        <div className="flex gap-1">
          <Button variant={showArchived ? 'contained' : 'outlined'}
            startIcon={<ArchiveIcon />} onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ver activos' : 'Archivados'}
          </Button>
          {!showArchived && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>Agregar producto</Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-sm text-slate">
          {showArchived ? 'No hay productos archivados.' : 'No hay productos registrados.'}
        </p>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          {visible.map((p) => (
            <div key={p.id} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
              <ProductCard product={p} onArchive={(id) => archiveMutation.mutate(id)}
                onRestore={(id) => restoreMutation.mutate(id)} showArchived={showArchived} />
            </div>
          ))}
        </div>
      )}

      {!showArchived && <AddProductDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
