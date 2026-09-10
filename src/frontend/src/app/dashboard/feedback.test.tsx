import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@mui/material';
import { DashboardFeedbackProvider, useDashboardFeedback } from './feedback';

function FeedbackHarness() {
  const feedback = useDashboardFeedback();
  return (
    <div>
      <Button onClick={() => feedback.success('Producto guardado')}>success</Button>
      <Button onClick={() => feedback.error('No se pudo guardar el producto')}>error</Button>
      <Button onClick={() => feedback.notify('Stock bajo: PLA Rojo.', 'warning')}>low-stock</Button>
      <p>Stock bajo persistente: PLA Rojo</p>
    </div>
  );
}

describe('DashboardFeedbackProvider', () => {
  it('renders centralized success and error popups', async () => {
    const user = userEvent.setup();
    render(<DashboardFeedbackProvider><FeedbackHarness /></DashboardFeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByText('Producto guardado')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'error' }));
    expect(screen.getByText('No se pudo guardar el producto')).toBeTruthy();
  });

  it('closes a low-stock popup without removing persistent stock visibility', async () => {
    const user = userEvent.setup();
    render(<DashboardFeedbackProvider><FeedbackHarness /></DashboardFeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'low-stock' }));
    expect(screen.getByText('Stock bajo: PLA Rojo.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByText('Stock bajo: PLA Rojo.')).toBeNull();
    expect(screen.getByText('Stock bajo persistente: PLA Rojo')).toBeTruthy();
  });
});
