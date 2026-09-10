import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import BudgetBreakdown from './BudgetBreakdown';
import { buildTheme } from '@/app/theme';
import type { BudgetResponse } from '@/app/api';

function budgetResponse(overrides: Partial<BudgetResponse> = {}): BudgetResponse {
  return {
    id: 'budget-1',
    order_id: 'order-1',
    version: 1,
    currency: 'ARS',
    printer_id: null,
    printer_name: null,
    power_watts: 120,
    lifespan_hours: 4320,
    spare_parts_cost: 150000,
    filament_items: [],
    manual_filament_cost: null,
    manual_grams: null,
    hours: 2,
    minutes: 0,
    margin_type: 'retail',
    extra_costs: 0,
    assembly_cost: 0,
    sanding_cost: 0,
    painting_cost: 0,
    error_margin_percent: 5,
    margin_multiplier: 4,
    final_price: 1000,
    manual_price: null,
    filament_total: 0,
    electricity_cost: 0,
    amortization_cost: 0,
    subtotal: 0,
    subtotal_with_error: 0,
    post_processing_total: 0,
    total_before_margin: 0,
    notes: null,
    created_at: '2026-09-09T00:00:00Z',
    updated_at: '2026-09-09T00:00:00Z',
    ...overrides,
  };
}

describe('BudgetBreakdown', () => {
  it('R15 renders the computed breakdown without the ML suggested price line', () => {
    render(
      <ThemeProvider theme={buildTheme(null)}>
        <BudgetBreakdown budget={budgetResponse()} orderId="order-1" />
      </ThemeProvider>,
    );

    expect(screen.getByText('Precio final')).toBeTruthy();
    expect(screen.queryByText(/MercadoLibre/i)).toBeNull();
    expect(screen.queryByText(/ML suggested/i)).toBeNull();
  });
});