import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/app/theme';
import { DashboardFeedbackProvider } from '../../feedback';
import type { Product } from '@/app/api';
import * as api from '@/app/api';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'product-1' }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    uploadProductImage: vi.fn(),
    fetchProductStockMovements: vi.fn(),
    adjustProductStock: vi.fn(),
  };
});

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    user_id: 'user-1',
    name: 'Mesa organizadora',
    description: 'Pieza modular para escritorio',
    price: 25.5,
    stock_quantity: 7,
    image_url: null,
    is_active: true,
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
    ...overrides,
  };
}

async function renderProductDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { default: ProductDetailPage } = await import('./page');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <DashboardFeedbackProvider>
          <ProductDetailPage />
        </DashboardFeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ProductDetailPage redesigned fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchProduct).mockResolvedValue(product());
    vi.mocked(api.fetchProductStockMovements).mockResolvedValue([]);
  });

  it('R26 keeps product detail key fields present after the card redesign', async () => {
    await renderProductDetail();

    expect(await screen.findByText('Mesa organizadora')).toBeTruthy();
    expect(screen.getByText('Pieza modular para escritorio')).toBeTruthy();
    expect(screen.getByText('Stock operativo')).toBeTruthy();
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
    expect(screen.getByText('$25.50')).toBeTruthy();
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin movimientos de stock registrados.')).toBeTruthy();
  });
});
