import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotFound from './not-found';
import DashboardError from './dashboard/error';
import GlobalError from './global-error';
import { DashboardUnavailableState } from './dashboard/unavailable-state';

describe('dashboard error states', () => {
  it('R18 renders Spanish 404 copy with safe dashboard navigation and no raw object text', () => {
    render(<NotFound />);

    expect(screen.getByText('No encontramos esta página')).toBeTruthy();
    expect(screen.getByText('Volver al dashboard')).toBeTruthy();
    expect(document.body.textContent).not.toContain('[object Object]');
  });

  it('R19 renders server unavailable/offline copy with retry navigation', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<DashboardUnavailableState onRetry={retry} />);

    expect(screen.getByText('Servidor no disponible')).toBeTruthy();
    expect(screen.getByText(/offline o sin responder/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(retry).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('[object Object]');
  });

  it('R20 renders route and global error fallbacks without raw stack traces', () => {
    const reset = vi.fn();
    render(<DashboardError error={new Error('internal stack should not render')} reset={reset} />);

    expect(screen.getByText('Algo falló en el panel')).toBeTruthy();
    expect(document.body.textContent).not.toContain('internal stack should not render');
    expect(document.body.textContent).not.toContain('[object Object]');

    render(<GlobalError error={new Error('global stack should not render')} reset={reset} />);

    expect(screen.getByText('Flayer no pudo renderizar esta vista')).toBeTruthy();
    expect(document.body.textContent).not.toContain('global stack should not render');
    expect(document.body.textContent).not.toContain('[object Object]');
  });
});
