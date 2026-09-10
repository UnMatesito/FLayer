import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import DeliveryCostDialog from './DeliveryCostDialog';
import { buildTheme } from '@/app/theme';
import * as api from '@/app/api';

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    updateDeliveryCost: vi.fn(),
  };
});

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <DeliveryCostDialog
          open
          orderId="order-1"
          initialEmbalaje={null}
          initialPrecioEnvio={null}
          onClose={vi.fn()}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

const embalajeInput = () => screen.getByLabelText('embalaje') as HTMLInputElement;
const envioInput = () => screen.getByLabelText('Precio Envio') as HTMLInputElement;

describe('DeliveryCostDialog (create_order R20-R21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.updateDeliveryCost).mockResolvedValue({} as never);
  });

  it('R20 the modal exposes numeric embalaje and Precio Envio inputs, and no Peso field', () => {
    renderDialog();

    expect(screen.getByText('Agregar costo de Entrega')).toBeTruthy();
    expect(embalajeInput().type).toBe('number');
    expect(envioInput().type).toBe('number');
    expect(screen.queryByLabelText('Peso')).toBeNull();
  });

  it('R21 a non-numeric value is rejected on the client and the API is not called', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(embalajeInput(), 'abc');
    await user.type(envioInput(), '10');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText(/valores numéricos válidos/i)).toBeTruthy());
    expect(api.updateDeliveryCost).not.toHaveBeenCalled();
  });

  it('R21 a negative value is rejected on the client and the API is not called', async () => {
    const user = userEvent.setup();
    renderDialog();

    fireEvent.change(embalajeInput(), { target: { value: '-5' } });
    await user.type(envioInput(), '10');
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(screen.getByText(/valores numéricos válidos/i)).toBeTruthy());
    expect(api.updateDeliveryCost).not.toHaveBeenCalled();
  });

  it('R20 saving valid values calls updateDeliveryCost with the payload and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <ThemeProvider theme={buildTheme(null)}>
          <DeliveryCostDialog
            open
            orderId="order-1"
            initialEmbalaje={null}
            initialPrecioEnvio={null}
            onClose={onClose}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    await user.type(embalajeInput(), '12.5');
    await user.type(envioInput(), '750');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(api.updateDeliveryCost).toHaveBeenCalledWith('order-1', { embalaje: 12.5, precio_envio: 750 }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    unmount();
  });
});