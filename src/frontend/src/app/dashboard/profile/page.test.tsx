import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/app/theme';
import { DashboardFeedbackProvider } from '../feedback';
import type { User } from '@/app/api';
import * as api from '@/app/api';

let currentUser: User;
const refreshUser = vi.fn();

vi.mock('../../auth-context', () => ({
  useAuth: () => ({
    user: currentUser,
    loading: false,
    login: vi.fn(),
    verifyOtp: vi.fn(),
    logout: vi.fn(),
    refreshUser,
  }),
}));

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchBudgetParameters: vi.fn(),
    updateBudgetParameters: vi.fn(),
    updateProfile: vi.fn(),
    updateUserCurrency: vi.fn(),
    uploadLogo: vi.fn(),
    removeLogo: vi.fn(),
    uploadFavicon: vi.fn(),
    removeFavicon: vi.fn(),
  };
});

function userData(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'maker@example.com',
    name: 'Maker',
    business_name: 'Taller Maker',
    primary_color: null,
    logo_url: '/uploads/logo_user.png?v=10',
    favicon_url: null,
    currency: 'ARS',
    ...overrides,
  };
}

function budgetParameters() {
  return {
    parameters: Object.fromEntries(['ARS', 'USD', 'EUR', 'BRL', 'GBP', 'MXN'].map((currency) => [currency, {
      currency,
      electricity_price_kwh: 10,
      error_margin_percent: 5,
      is_default: currency === 'ARS',
    }])),
  } as api.BudgetParametersBundle;
}

async function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { default: ProfilePage } = await import('./page');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <DashboardFeedbackProvider>
          <ProfilePage />
        </DashboardFeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ProfilePage favicon card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = userData();
    vi.mocked(api.fetchBudgetParameters).mockResolvedValue(budgetParameters());
    vi.mocked(api.uploadFavicon).mockResolvedValue(userData({ favicon_url: '/uploads/favicon_user.png?v=20' }));
    vi.mocked(api.removeFavicon).mockResolvedValue(userData({ favicon_url: null }));
  });

  it('R7 uploads favicon without mutating Logotipo UI state', async () => {
    const user = userEvent.setup();
    const view = await renderProfile();

    expect(screen.getByAltText('Logotipo actual').getAttribute('src')).toBe('/uploads/logo_user.png?v=10');
    const faviconInput = view.container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1];
    await user.upload(faviconInput, new File(['favicon'], 'favicon.png', { type: 'image/png' }));

    await waitFor(() => expect(api.uploadFavicon).toHaveBeenCalled());
    expect(screen.getByAltText('Logotipo actual').getAttribute('src')).toBe('/uploads/logo_user.png?v=10');
    expect(refreshUser).toHaveBeenCalled();
  });

  it('R7 removes favicon without mutating Logotipo UI state', async () => {
    const user = userEvent.setup();
    currentUser = userData({ favicon_url: '/uploads/favicon_user.png?v=20' });
    await renderProfile();

    await user.click(screen.getByRole('button', { name: 'Quitar favicon' }));

    await waitFor(() => expect(api.removeFavicon).toHaveBeenCalled());
    expect(screen.getByAltText('Logotipo actual').getAttribute('src')).toBe('/uploads/logo_user.png?v=10');
    expect(api.removeLogo).not.toHaveBeenCalled();
  });
});
