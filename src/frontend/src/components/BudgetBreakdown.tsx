'use client';

import {
  Table, TableBody, TableCell, TableRow, TableHead,
} from '@mui/material';
import { BUDGET_MARGIN_OPTIONS, currencySymbol, MACHINE_DEFAULT_FALLBACKS } from '@/app/api';
import { type BudgetResponse } from '@/app/api';

interface Props {
  budget: BudgetResponse;
  orderId: string;
}

function marginLabel(type: string) {
  if (type === 'custom') return 'Personalizado';
  return BUDGET_MARGIN_OPTIONS.find((option) => option.value === type)?.reference ?? type;
}

export default function BudgetBreakdown({ budget }: Props) {
  const sym = currencySymbol(budget.currency);

  const powerWatts = budget.power_watts ?? 120;
  const lifespanHours = budget.lifespan_hours ?? MACHINE_DEFAULT_FALLBACKS[budget.currency].lifespan_hours;
  const sparePartsCost = budget.spare_parts_cost ?? MACHINE_DEFAULT_FALLBACKS[budget.currency].spare_parts_cost;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-slate">
          Version: v{budget.version}
        </p>
      </div>

      {budget.filament_items.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-sm font-medium">Filamentos</p>
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
        </div>
      )}

      {budget.manual_filament_cost != null && (
        <p className="mb-1 text-sm text-slate">
          Costo manual de filamento: {sym}{budget.manual_filament_cost.toFixed(2)}
          {budget.manual_grams != null && ` (${budget.manual_grams}g)`}
        </p>
      )}

      <div className="mb-1 rounded-md bg-canvas p-1.5">
        <p className="mb-1 text-sm font-semibold">
          Máquina
        </p>
        <p className="text-sm">
          {budget.printer_name ? `Impresora: ${budget.printer_name}` : 'Impresora: parámetros por defecto'}
        </p>
        <p className="text-sm text-slate">
          Potencia: {powerWatts}W · Vida útil: {lifespanHours}h · Repuestos: {sym}{sparePartsCost.toFixed(2)}
        </p>
      </div>

      <hr className="my-1 border-line" />

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
            <TableCell sx={{ fontWeight: 600 }}>Ensamble</TableCell>
            <TableCell align="right">{sym}{budget.assembly_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Lijado</TableCell>
            <TableCell align="right">{sym}{budget.sanding_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Pintura / barniz</TableCell>
            <TableCell align="right">{sym}{budget.painting_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Post-procesado total</TableCell>
            <TableCell align="right">{sym}{budget.post_processing_total.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>
              Subtotal + margen ({budget.margin_multiplier}x, {marginLabel(budget.margin_type)})
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

      <div className="mt-1 flex items-center justify-between rounded-md bg-primary p-2 text-[var(--mui-palette-primary-contrastText)]">
        <h3 className="text-[1.25rem] font-bold">Precio final pieza</h3>
        <h3 className="text-[1.25rem] font-bold">
          {sym}{budget.final_price.toFixed(2)}
        </h3>
      </div>
      {budget.notes && (
        <div className="mt-2 rounded-md bg-canvas p-1.5">
          <p className="text-xs font-semibold text-slate">Notas</p>
          <p className="whitespace-pre-wrap text-sm">{budget.notes}</p>
        </div>
      )}
    </div>
  );
}
