'use client';

import {
  Box, Card, CardContent, CardMedia, Typography, Stack, Chip,
  Button, IconButton, TextField, InputAdornment, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import type { SxProps, Theme } from '@mui/material';
import type { Product, LineItem } from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 2,
  },
};

interface Props {
  products: Product[];
  lineItems: LineItem[];
  selectedIds: Set<string>;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (productId: string, quantity: number, maxStock: number) => void;
  onRemove: (productId: string) => void;
}

export default function ProductSelector({
  products,
  lineItems,
  selectedIds,
  onAdd,
  onUpdateQuantity,
  onRemove,
}: Props) {
  if (products.length === 0) {
    return <Alert severity="info">No hay productos activos.</Alert>;
  }

  return (
    <Box sx={styles.grid}>
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
                    onClick={() => onUpdateQuantity(product.id, cartItem.quantity - 1, product.stock_quantity)}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    type="number"
                    size="small"
                    value={cartItem.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) onUpdateQuantity(product.id, val, product.stock_quantity);
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
                    onClick={() => onRemove(product.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => onAdd(product)}
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
  );
}
