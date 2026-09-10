import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import BudgetForm from './BudgetForm';
import { buildTheme } from '@/app/theme';
import { BUDGET_MARGIN_OPTIONS, type BudgetCreate, type BudgetResponse } from '@/app/api';
import * as api from '@/app/api';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'maker@example.com',
      name: 'Maker',
      business_name: null,
      primary_color: null,
      logo_url: null,
      currency: 'ARS' as const,
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    verifyOtp: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchFilaments: vi.fn(),
    fetchPrinters: vi.fn(),
    previewBudget: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
  };
});

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

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <BudgetForm
          open
          orderId="order-1"
          onClose={() => undefined}
          existingBudget={null}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function presetIsActive(button: HTMLElement): boolean {
  return button.className.includes('MuiButton-contained');
}

function savedPayload(): BudgetCreate {
  return vi.mocked(api.createBudget).mock.calls[0][1];
}

describe('BudgetForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchFilaments).mockResolvedValue([]);
    vi.mocked(api.fetchPrinters).mockResolvedValue([]);
    vi.mocked(api.previewBudget).mockResolvedValue(budgetResponse());
    vi.mocked(api.createBudget).mockResolvedValue(budgetResponse());
    vi.mocked(api.updateBudget).mockResolvedValue(budgetResponse());
  });

  it('R13 preset buttons write the numeric margin input and only the exact preset stays active', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('Multiplicador') as HTMLInputElement;
    const preset = (label: string) => screen.getByRole('button', { name: label });

    expect(input.value).toBe('4');
    expect(presetIsActive(preset('×4.0'))).toBe(true);
    expect(presetIsActive(preset('×3.0'))).toBe(false);

    await user.click(preset('×2.5'));

    expect(input.value).toBe('2.5');
    expect(presetIsActive(preset('×2.5'))).toBe(true);
    BUDGET_MARGIN_OPTIONS.filter((o) => o.multiplier !== 2.5).forEach((o) => {
      expect(presetIsActive(preset(o.label))).toBe(false);
    });
  });

  it('R13 a custom multiplier such as 6 disables every preset button and submits a custom margin', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText('Multiplicador') as HTMLInputElement;

    await user.clear(input);
    await user.type(input, '6');

    expect(input.value).toBe('6');
    BUDGET_MARGIN_OPTIONS.forEach((o) => {
      expect(presetIsActive(screen.getByRole('button', { name: o.label }))).toBe(false);
    });

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.createBudget).toHaveBeenCalled());
    const payload = savedPayload();
    expect(payload.margin_type).toBe('custom');
    expect(payload.margin_multiplier).toBe(6);
  });

  it('R14 disabling post-processing removes the inputs and submits zero post-processing costs', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = () => screen.getByLabelText('Requiere post-procesado') as HTMLInputElement;

    expect(toggle().checked).toBe(false);
    expect(screen.queryByLabelText('Ensamble')).toBeNull();

    await user.click(toggle());
    await user.type(screen.getByLabelText('Ensamble'), '2500');
    await user.type(screen.getByLabelText('Lijado'), '500');
    await user.type(screen.getByLabelText('Pintura / barniz'), '750');

    await user.click(toggle());

    expect(toggle().checked).toBe(false);
    expect(screen.queryByLabelText('Ensamble')).toBeNull();
    expect(screen.queryByLabelText('Lijado')).toBeNull();
    expect(screen.queryByLabelText('Pintura / barniz')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.createBudget).toHaveBeenCalled());
    const payload = savedPayload();
    expect(payload.assembly_cost).toBe(0);
    expect(payload.sanding_cost).toBe(0);
    expect(payload.painting_cost).toBe(0);
  });

  it('R15 the form preview shows no ML suggested price line', async () => {
    renderForm();

    await screen.findByText('Previsualización', undefined, { timeout: 3000 });

    expect(screen.queryByText(/MercadoLibre/i)).toBeNull();
    expect(screen.queryByText(/ML suggested/i)).toBeNull();
  });
});