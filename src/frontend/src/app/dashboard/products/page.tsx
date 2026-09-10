'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, Drawer, TextField, IconButton, FormControl, InputLabel, MenuItem, Select,
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
import Pagination, { usePagination } from '@/components/Pagination';
import { useDashboardFeedback } from '../feedback';
import { normalizeApiError } from '@/app/error-normalizer';

function AddProductDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const feedback = useDashboardFeedback();
  const [form, setForm] = useState<ProductCreate>({ name: '', price: 0, description: '', stock_quantity: 0 });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createProduct(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      onClose();
      setForm({ name: '', price: 0, description: '', stock_quantity: 0 });
      setError('');
      feedback.success('Producto guardado');
    },
    onError: (err: unknown) => {
      const message = normalizeApiError(err, 'No se pudo crear el producto');
      setError(message);
      feedback.error(message);
    },
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 460 }, maxWidth: '100vw' } } }}>
      <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="text-[1.15rem] font-semibold">Agregar producto</h3>
        <p className="text-sm text-slate">La lista queda visible detrás del panel.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
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
      </div>
      <div className="flex justify-end gap-1 border-t border-line p-2">
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
      </div>
    </Drawer>
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
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'available'>('all');
  const feedback = useDashboardFeedback();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', { archived: showArchived }],
    queryFn: () => fetchProducts(showArchived),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      feedback.success('Producto archivado');
    },
    onError: (err: unknown) => feedback.error(normalizeApiError(err, 'No se pudo archivar el producto')),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateProduct(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      feedback.success('Producto restaurado');
    },
    onError: (err: unknown) => feedback.error(normalizeApiError(err, 'No se pudo restaurar el producto')),
  });

  const visible = (showArchived
    ? products?.filter((p) => !p.is_active) ?? []
    : products?.filter((p) => p.is_active) ?? [])
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()))
    .filter((p) => stockFilter === 'all' || (stockFilter === 'low' ? p.stock_quantity < 1 : p.stock_quantity >= 1));
  const lowCount = products?.filter((p) => p.is_active && p.stock_quantity < 1).length ?? 0;
  const pagination = usePagination(visible.length, 10);

  useEffect(() => {
    pagination.setPage(0);
  }, [search, stockFilter, showArchived]);

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

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

      <div className="card rounded-md border border-line bg-snow p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TextField size="small" label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 260 } }} />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Stock</InputLabel>
            <Select value={stockFilter} label="Stock" onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="low">Stock bajo</MenuItem>
              <MenuItem value="available">Disponible</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" onClick={() => { setSearch(''); setStockFilter('all'); }}>Limpiar filtros</Button>
          <p className="ml-auto text-[0.8rem] text-slate">{visible.length} resultados · {lowCount} stock bajo</p>
        </div>
        {lowCount === 0 && !showArchived && <p className="mb-2 text-[0.82rem] text-slate">Stock normal: no hay productos por debajo del mínimo MVP.</p>}
      {visible.length === 0 ? (
        <p className="py-6 text-sm text-slate">
          {search || stockFilter !== 'all' ? 'Productos no tiene resultados con los filtros activos.' : showArchived ? 'No hay productos archivados.' : 'No hay productos registrados.'}
        </p>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          {pagination.slice(visible).map((p) => (
            <div key={p.id} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
              <ProductCard product={p} onArchive={(id) => archiveMutation.mutate(id)}
                onRestore={(id) => restoreMutation.mutate(id)} showArchived={showArchived} />
            </div>
          ))}
        </div>
      )}
        <Pagination count={visible.length} page={pagination.page} onPageChange={pagination.setPage} rowsPerPage={pagination.rowsPerPage} onRowsPerPageChange={pagination.onRowsPerPageChange} />
      </div>

      {!showArchived && <AddProductDrawer open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
