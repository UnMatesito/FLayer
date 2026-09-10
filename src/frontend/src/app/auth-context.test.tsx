import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { applyFavicon, AuthProvider } from './auth-context';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('./api', () => ({
  fetchMe: vi.fn().mockResolvedValue({
    id: 'u1',
    email: 'maker@example.com',
    name: 'Maker',
    business_name: 'Maker Studio',
    primary_color: null,
    logo_url: null,
    favicon_url: '/uploads/favicon-user.png?v=1',
    currency: 'ARS',
  }),
  login: vi.fn(),
  logout: vi.fn(),
  verifyOtp: vi.fn(),
}));

let currentPath = '/dashboard';

describe('applyFavicon', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('uses the backend favicon URL as-is and resets to the default logo', () => {
    applyFavicon('/uploads/favicon-user.png?v=123');
    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).toBe('/uploads/favicon-user.png?v=123');
    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).not.toContain('Date.now');

    applyFavicon(null);
    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).toBe('/logo.svg');
  });

  it('re-applies the favicon after a client-side navigation wipes the head', async () => {
    currentPath = '/dashboard';
    const { rerender } = render(
      <AuthProvider>
        <p>child</p>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).toBe('/uploads/favicon-user.png?v=1');
    });

    currentPath = '/orders';
    document.head.innerHTML = '<link rel="icon" href="/logo.svg" />';

    rerender(
      <AuthProvider>
        <p>child</p>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).toBe('/uploads/favicon-user.png?v=1');
    });
  });
});