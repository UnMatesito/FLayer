import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/app/theme';
import { DashboardFeedbackProvider } from './feedback';
import type { DashboardSummary, LowStockResponse, Product } from '@/app/api';
import * as api from '@/app/api';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/protected-route', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'maker@example.com',
      name: 'Maker Test',
      business_name: null,
      primary_color: null,
      logo_url: null,
      favicon_url: null,
      currency: 'ARS',
    },
    loading: false,
    login: vi.fn(),
    verifyOtp: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchLowStock: vi.fn(),
    fetchDashboardSummary: vi.fn(),
    fetchProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  };
});

function lowStock(overrides: Partial<LowStockResponse> = {}): LowStockResponse {
  return {
    filaments: [],
    supplies: [],
    products: [],
    items: [],
    ...overrides,
  };
}

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    as_of: '2026-09-10T00:00:00Z',
    kpis: {
      orders_month: 0,
      revenue_month: 0,
      pending_orders: 0,
      printing_orders: 0,
      budgeted_value_quoting: 0,
      low_stock_filaments: 0,
      low_stock_supplies: 0,
      low_stock_products: 0,
      printers_active: 0,
      maintenance_month: 0,
    },
    activity: Array.from({ length: 14 }, (_, index) => ({ date: `2026-09-${String(index + 1).padStart(2, '0')}`, orders: 0, revenue: 0 })),
    recent_orders: [],
    low_stock: lowStock(),
    printers: [],
    ...overrides,
  };
}

function product(overrides: Partial<Product>): Product {
  return {
    id: 'product-1',
    user_id: 'user-1',
    name: 'Producto 1',
    description: 'Pieza',
    price: 10,
    stock_quantity: 2,
    image_url: null,
    is_active: true,
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
    ...overrides,
  };
}

function renderWithApp(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <DashboardFeedbackProvider>
          {ui}
        </DashboardFeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('dashboard low-stock states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('R10/R11 shows a closeable product low-stock popup and persistent Productos badge', async () => {
    vi.mocked(api.fetchLowStock).mockResolvedValue(lowStock({
      products: [{ id: 'product-low', name: 'Kit sin stock', stock_quantity: 0, threshold: 1 }],
      items: [{ id: 'product-low', type: 'product', label: 'Kit sin stock', current_stock: 0, threshold: 1, unit: 'uds.', href: '/dashboard/products/product-low' }],
    }));
    const { default: DashboardLayout } = await import('./layout');

    renderWithApp(<DashboardLayout><div>Contenido</div></DashboardLayout>);

    expect(await screen.findByText('Stock bajo: Kit sin stock.')).toBeTruthy();
    expect(screen.getAllByText('Productos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('R12 hides alarming stock badges and shows normal-stock copy when dashboard data has no low stock', async () => {
    vi.mocked(api.fetchDashboardSummary).mockResolvedValue(summary());
    const { default: DashboardPage } = await import('./page');

    renderWithApp(<DashboardPage />);

    expect(await screen.findByText('Stock normal: todo por encima del mínimo.')).toBeTruthy();
    expect(screen.queryByText(/Stock bajo:/)).toBeNull();
  });
});

describe('products filters and drawer context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchLowStock).mockResolvedValue(lowStock());
    vi.mocked(api.createProduct).mockResolvedValue(product({ id: 'created', name: 'Creado' }));
  });

  it('R14 filters update counts and filtered empty state for Productos', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchProducts).mockResolvedValue([
      product({ id: 'alpha', name: 'Alpha', stock_quantity: 2 }),
      product({ id: 'beta', name: 'Beta', stock_quantity: 0 }),
    ]);
    const { default: ProductsPage } = await import('./products/page');

    renderWithApp(<ProductsPage />);

    expect(await screen.findByText(/2 resultados · 1 stock bajo/)).toBeTruthy();

    await user.type(screen.getByLabelText('Buscar producto'), 'zzz');

    expect(screen.getByText(/0 resultados · 1 stock bajo/)).toBeTruthy();
    expect(screen.getByText('Productos no tiene resultados con los filtros activos.')).toBeTruthy();
  });

  it('R23/R24 opens and closes the product drawer without clearing active filters', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchProducts).mockResolvedValue([
      product({ id: 'alpha', name: 'Alpha', stock_quantity: 2 }),
      product({ id: 'beta', name: 'Beta', stock_quantity: 2 }),
    ]);
    const { default: ProductsPage } = await import('./products/page');

    renderWithApp(<ProductsPage />);
    await screen.findByText(/2 resultados/);

    await user.type(screen.getByLabelText('Buscar producto'), 'Alpha');
    expect(screen.getByText(/1 resultados/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(screen.getByText('La lista queda visible detrás del panel.')).toBeTruthy();
    expect((screen.getByLabelText('Buscar producto') as HTMLInputElement).value).toBe('Alpha');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect((screen.getByLabelText('Buscar producto') as HTMLInputElement).value).toBe('Alpha');
    expect(screen.getByText(/1 resultados/)).toBeTruthy();
  });
});
