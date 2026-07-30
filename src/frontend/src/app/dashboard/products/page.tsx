'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardMedia, CardContent, CardActions,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, IconButton, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  type Product, type ProductCreate,
} from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3,
    flexWrap: 'wrap', gap: 1,
  },
  card: {
    display: 'flex', flexDirection: 'column', cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
    '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
  },
  media: {
    height: 180, bgcolor: 'grey.100',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  price: {
    fontWeight: 700, fontSize: '1.25rem',
  },
  stock: {
    fontWeight: 600, fontSize: '0.9rem',
  },
  description: {
    color: 'text.secondary', fontSize: '0.85rem',
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  actions: {
    justifyContent: 'space-between', px: 2, pb: 1.5,
  },
};

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
      <DialogTitle>Agregar Producto</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth required error={!form.name.trim() && form.name.length > 0} />
          <TextField label="Precio" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            fullWidth required slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
          <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth multiline rows={3} />
          <TextField label="Stock inicial" type="number" value={form.stock_quantity}
            onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
            fullWidth slotProps={{ htmlInput: { min: 0, step: 1 } }} />
        </Stack>
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
    <Card sx={styles.card} onClick={() => router.push(`/dashboard/products/${product.id}`)}>
      {product.image_url ? (
        <CardMedia component="img" sx={{ height: 180, objectFit: 'cover' }}
          image={product.image_url} alt={product.name} />
      ) : (
        <Box sx={styles.media}>
          <Inventory2Icon sx={{ fontSize: 60, color: 'grey.300' }} />
        </Box>
      )}
      <CardContent sx={{ flexGrow: 1, pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          <Typography variant="h6" fontWeight={600} lineHeight={1.2}>{product.name}</Typography>
          <Chip label={product.is_active ? 'Activo' : 'Archivado'} size="small"
            color={product.is_active ? 'success' : 'default'} sx={{ flexShrink: 0 }} />
        </Box>
        {product.description && (
          <Typography sx={styles.description} mb={1}>{product.description}</Typography>
        )}
        <Stack direction="row" spacing={3} alignItems="baseline">
          <Box>
            <Typography variant="caption" color="text.secondary">Precio</Typography>
            <Typography sx={styles.price}>${Number(product.price).toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Stock</Typography>
            <Typography sx={{
              ...styles.stock,
              color: product.stock_quantity < 1 ? 'warning.main' : 'success.main',
            }}>
              {product.stock_quantity} {product.stock_quantity === 1 ? 'unidad' : 'uds.'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      <CardActions sx={styles.actions} onClick={(e) => e.stopPropagation()}>
        <Typography variant="caption" color="text.disabled">
          {new Date(product.created_at).toLocaleDateString()}
        </Typography>
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
      </CardActions>
    </Card>
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  const visible = showArchived
    ? products?.filter((p) => !p.is_active) ?? []
    : products?.filter((p) => p.is_active) ?? [];

  return (
    <Box>
      <Box sx={styles.header}>
        <Typography variant="h5" fontWeight={600}>
          {showArchived ? 'Productos archivados' : 'Productos'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant={showArchived ? 'contained' : 'outlined'}
            startIcon={<ArchiveIcon />} onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ver activos' : 'Archivados'}
          </Button>
          {!showArchived && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>Agregar Producto</Button>
          )}
        </Stack>
      </Box>

      {visible.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Inventory2Icon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">
            {showArchived ? 'No hay productos archivados.' : 'No hay productos registrados.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {visible.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ProductCard product={p} onArchive={(id) => archiveMutation.mutate(id)}
                onRestore={(id) => restoreMutation.mutate(id)} showArchived={showArchived} />
            </Grid>
          ))}
        </Grid>
      )}

      {!showArchived && <AddProductDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </Box>
  );
}
