'use client';

import {
  Box, Typography, Stack, Table, TableBody, TableCell, TableRow,
  TableHead, Divider,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { type BudgetResponse } from '@/app/api';

interface Props {
  budget: BudgetResponse;
  orderId: string;
}

function currencySymbol(currency: 'ARS' | 'USD') {
  return currency === 'USD' ? 'US$' : '$';
}

function marginLabel(type: string) {
  switch (type) {
    case 'wholesale': return 'Mayorista';
    case 'retail': return 'Comercio';
    case 'keychain': return 'Llavero';
    default: return type;
  }
}

export default function BudgetBreakdown({ budget }: Props) {
  const sym = currencySymbol(budget.currency);

  const powerWatts = budget.power_watts ?? 120;
  const lifespanHours = budget.lifespan_hours ?? (budget.currency === 'USD' ? 5000 : 4320);
  const sparePartsCost = budget.spare_parts_cost ?? (budget.currency === 'USD' ? 400 : 150000);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>Presupuesto</Typography>
        <Typography variant="caption" color="text.secondary">
          v{budget.version}
        </Typography>
      </Box>

      {budget.filament_items.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Filamentos</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Producto</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Gramos</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Precio/kg</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Costo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budget.filament_items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">{item.grams.toFixed(1)}g</TableCell>
                  <TableCell align="right">{sym}{item.price_per_kg.toFixed(2)}</TableCell>
                  <TableCell align="right">{sym}{item.cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {budget.manual_filament_cost != null && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Costo manual de filamento: {sym}{budget.manual_filament_cost.toFixed(2)}
          {budget.manual_grams != null && ` (${budget.manual_grams}g)`}
        </Typography>
      )}

      <Box sx={{ mb: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Máquina
        </Typography>
        <Typography variant="body2">
          {budget.printer_name ? `Impresora: ${budget.printer_name}` : 'Impresora: parámetros por defecto'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Potencia: {powerWatts}W · Vida útil: {lifespanHours}h · Repuestos: {sym}{sparePartsCost.toFixed(2)}
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Filamento total</TableCell>
            <TableCell align="right">{sym}{budget.filament_total.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Electricidad</TableCell>
            <TableCell align="right">{sym}{budget.electricity_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Amortización</TableCell>
            <TableCell align="right">{sym}{budget.amortization_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Margen de error ({budget.error_margin_percent}%)</TableCell>
            <TableCell align="right">{sym}{budget.subtotal_with_error.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Costos extra</TableCell>
            <TableCell align="right">{sym}{budget.extra_costs.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>
              Subtotal + margen ({marginLabel(budget.margin_type)}, {budget.margin_multiplier}x)
            </TableCell>
            <TableCell align="right">{sym}{budget.total_before_margin.toFixed(2)}</TableCell>
          </TableRow>
          {budget.manual_price != null && (
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Precio manual</TableCell>
              <TableCell align="right">{sym}{budget.manual_price.toFixed(2)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Box
        sx={{
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          p: 2,
          borderRadius: 1,
          mt: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={700}>Precio final</Typography>
        <Typography variant="h6" fontWeight={700}>
          {sym}{budget.final_price.toFixed(2)}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'right' }}>
        Precio ML sugerido: {sym}{budget.ml_price.toFixed(2)}
      </Typography>

      {budget.notes && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary">Notas</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{budget.notes}</Typography>
        </Box>
      )}
    </Box>
  );
}
