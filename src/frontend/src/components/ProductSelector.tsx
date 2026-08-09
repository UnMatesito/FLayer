'use client';

import {
  Alert, Button, Chip, IconButton, InputAdornment, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Product, LineItem } from '@/app/api';

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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
      {products.filter((p) => p.is_active).map((product) => {
        const inCart = selectedIds.has(product.id);
        const cartItem = lineItems.find((item) => item.product_id === product.id);
        const outOfStock = product.stock_quantity < 1;
        return (
          <div
            key={product.id}
            className={`rounded-md border bg-snow ${
              inCart ? 'border-2 border-primary' : 'border-line'
            } ${outOfStock ? 'opacity-50' : ''}`}
          >
            <img
              src={product.image_url || '/placeholder.svg'}
              alt={product.name}
              className="h-[120px] w-full rounded-t-md object-cover"
            />
            <div className="p-2 pb-1">
              <h3 className="truncate text-sm font-semibold">
                {product.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[1.25rem] font-bold text-primary">
                  ${Number(product.price).toFixed(2)}
                </span>
                <Chip
                  label={outOfStock ? 'Sin stock' : `${product.stock_quantity} uds.`}
                  size="small"
                  color={product.stock_quantity <= 3 ? 'warning' : 'default'}
                />
              </div>
              {outOfStock ? (
                <Button variant="outlined" disabled size="small" sx={{ mt: 1 }} fullWidth>
                  Sin stock
                </Button>
              ) : inCart && cartItem ? (
                <div className="mt-1 flex items-center gap-1">
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
                </div>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
