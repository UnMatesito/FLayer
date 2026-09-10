import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/app/theme';
import type { OrderDetail } from '@/app/api';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ord-test-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/protected-route', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'a@b.com', name: 'T', business_name: null, primary_color: null, logo_url: null, currency: 'ARS' },
    loading: false,
    login: vi.fn(),
    verifyOtp: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api')>();
  return {
    ...actual,
    fetchOrderDetail: vi.fn(),
    fetchBudget: vi.fn(),
    updateOrderStatus: vi.fn(),
  };
});

function buildOrder(overrides: Partial<OrderDetail>): OrderDetail {
  return {
    id: 'ord-test-1',
    customer_id: 'cust-1',
    customer_name: 'Cliente Test',
    customer_email: 'test@example.com',
    work_type: 'impresion_3d',
    description: 'Pieza de prueba',
    files: null,
    status: 'new',
    client_notified: false,
    order_category: 'print',
    needs_3d_printing: true,
    needs_3d_modelling: false,
    dimensions: null,
    type_of_delivery: 'Presencial acordado',
    delivery_embalaje: null,
    delivery_precio_envio: null,
    filament_id: null,
    grams_estimated: null,
    fixed_product_id: null,
    line_items: null,
    total: null,
    has_budget: false,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

async function renderPage(orderOverrides: Partial<OrderDetail> = {}) {
  const api = vi.mocked(await import('@/app/api'));
  const order = buildOrder(orderOverrides);
  vi.mocked(api.fetchOrderDetail).mockResolvedValue(order);
  vi.mocked(api.fetchBudget).mockRejectedValue(new Error('no budget'));
  vi.mocked(api.updateOrderStatus).mockResolvedValue({ id: order.id, status: order.status });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { default: OrderDetailPage } = await import('./page');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <OrderDetailPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('OrderDetailPage R18/R19 delivery-cost button visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R18 button is visible when type_of_delivery is Delivery', async () => {
    await renderPage({ type_of_delivery: 'Delivery' });
    await waitFor(() => {
      expect(screen.getByText('Agregar costo de Entrega')).toBeTruthy();
    });
  });

  it('R19 button is absent when type_of_delivery is Presencial acordado', async () => {
    await renderPage({ type_of_delivery: 'Presencial acordado' });
    await waitFor(() => {
      expect(screen.queryByText('Agregar costo de Entrega')).toBeNull();
    });
  });
});
