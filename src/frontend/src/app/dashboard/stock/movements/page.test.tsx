import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/app/theme';
import type { MovementItemOption, PaginatedUnifiedMovements } from '@/app/api';
import * as api from '@/app/api';

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchMovementItems: vi.fn(),
    fetchUnifiedMovements: vi.fn(),
  };
});

const options: MovementItemOption[] = [
  { key: 'product:product-1', id: 'product-1', type: 'product', type_label: 'Producto', label: 'Miniatura' },
  { key: 'filament:filament-1', id: 'filament-1', type: 'filament', type_label: 'Filamento', label: 'PLA Rojo' },
  { key: 'supply:supply-1', id: 'supply-1', type: 'supply', type_label: 'Insumo', label: 'Alcohol IPA' },
];

function movements(overrides: Partial<PaginatedUnifiedMovements> = {}): PaginatedUnifiedMovements {
  return {
    total: 1,
    page: 1,
    per_page: 50,
    items: [{
      id: 'movement-1',
      source: 'product',
      item_id: 'product-1',
      item_type: 'product',
      item_type_label: 'Producto',
      item_name: 'Miniatura',
      movement_type: 'adjustment',
      quantity: 3,
      unit: 'uds.',
      order_id: 'order-12345678',
      created_by_user_id: 'user-1',
      metadata: { notes: 'alta inicial' },
      created_at: '2026-09-10T12:00:00Z',
    }],
    ...overrides,
  };
}

async function renderMovementsPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { default: MovementsPage } = await import('./page');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <MovementsPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('MovementsPage unified historial UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMovementItems).mockResolvedValue(options);
    vi.mocked(api.fetchUnifiedMovements).mockResolvedValue(movements());
  });

  it('R15/R16 shows one unified multi-select with Producto, Filamento and Insumo options and preserves row metadata', async () => {
    const user = userEvent.setup();
    await renderMovementsPage();

    expect(await screen.findByText('Miniatura')).toBeTruthy();
    expect(screen.getByText('alta inicial')).toBeTruthy();
    expect(screen.getAllByText('Producto').length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('combobox')[1]);

    expect(await screen.findByText('PLA Rojo')).toBeTruthy();
    expect(screen.getByText('Alcohol IPA')).toBeTruthy();
    expect(screen.getAllByText('Filamento').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Insumo').length).toBeGreaterThan(0);
  });

  it('R17 shows a filtered Historial empty state with a reset action', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchUnifiedMovements).mockResolvedValue(movements({ items: [], total: 0 }));
    await renderMovementsPage();

    expect(await screen.findByText('Historial no tiene movimientos con los filtros activos.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => expect(api.fetchUnifiedMovements).toHaveBeenCalled());
    expect(screen.getByText('Historial no tiene movimientos con los filtros activos.')).toBeTruthy();
  });
});
