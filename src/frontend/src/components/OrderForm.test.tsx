import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import OrderForm from './OrderForm';
import { buildTheme } from '@/app/theme';
import type { OrderPayload } from '@/app/api';
import * as api from '@/app/api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'token' ? 'tok-123' : null),
  }),
}));

vi.mock('@/app/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    createPublicOrder: vi.fn(),
    fetchPublicProducts: vi.fn(),
  };
});

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme(null)}>
        <OrderForm />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function sentPayload(): OrderPayload {
  return vi.mocked(api.createPublicOrder).mock.calls[0][0] as OrderPayload;
}

const printRadio = () => screen.getByRole('radio', { name: 'Impresión' });
const productRadio = () => screen.getByRole('radio', { name: 'Producto' });
const printingCheckbox = () => screen.getByRole('checkbox', { name: '3d printing' }) as HTMLInputElement;
const modellingCheckbox = () => screen.getByRole('checkbox', { name: '3d modelling' }) as HTMLInputElement;

async function selectPrintAndFillBase(user: ReturnType<typeof userEvent.setup>) {
  await user.click(printRadio());
  await user.click(screen.getByRole('radio', { name: 'Presencial acordado' }));
  await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cliente');
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'c@example.com');
  await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Pieza de prueba');
  await user.type(screen.getByRole('textbox', { name: 'Dimensions' }), '100 x 50 x 20');
}

describe('OrderForm (create_order R8-R17, R24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchPublicProducts).mockResolvedValue([]);
    vi.mocked(api.createPublicOrder).mockResolvedValue({} as never);
  });

  it('R8 order category selector exposes exactly print and product options', () => {
    renderForm();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Impresión' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Producto' })).toBeTruthy();
  });

  it('R9 category-specific detail inputs are hidden until a category is selected', () => {
    renderForm();
    expect(screen.queryByLabelText('Dimensions')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: '3d printing' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Presencial acordado' })).toBeNull();
  });

  it('R10 submitting without a category is rejected on the client and the API is not called', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cliente');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'c@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar Pedido' }));

    await waitFor(() => expect(screen.getByText('Elegí una categoría para continuar.')).toBeTruthy());
    expect(api.createPublicOrder).not.toHaveBeenCalled();
  });

  it('R24+R11 selecting print shows both service checkboxes with 3d printing checked by default', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(printRadio());

    expect(printingCheckbox().checked).toBe(true);
    expect(modellingCheckbox().checked).toBe(false);
  });

  it('R12 selecting product hides the print service checkboxes and loads products', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(productRadio());

    expect(screen.queryByRole('checkbox', { name: '3d printing' })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: '3d modelling' })).toBeNull();
    expect(api.fetchPublicProducts).toHaveBeenCalled();
  });

  it('R13 print order with no service selected is rejected on the client and the API is not called', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectPrintAndFillBase(user);
    await user.click(printingCheckbox());

    expect(printingCheckbox().checked).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Enviar Pedido' }));

    await waitFor(() => expect(screen.getByText('Seleccioná al menos un servicio de impresión.')).toBeTruthy());
    expect(api.createPublicOrder).not.toHaveBeenCalled();
  });

  it('R14 shows the exact dimensions helper text for print orders', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(printRadio());

    expect(screen.getByText('largo x ancho x alto en mm (De la pieza mas grande)')).toBeTruthy();
  });

  it('R16 the type of delivery selector offers Presencial acordado and Delivery', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(printRadio());

    expect(screen.getByRole('radio', { name: 'Presencial acordado' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Delivery' })).toBeTruthy();
  });

  it('R17 submitting without a delivery type is rejected on the client and the API is not called', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(printRadio());
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cliente');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'c@example.com');
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Pieza de prueba');

    await user.click(screen.getByRole('button', { name: 'Enviar Pedido' }));

    await waitFor(() => expect(screen.getByText('Elegí el tipo de entrega.')).toBeTruthy());
    expect(api.createPublicOrder).not.toHaveBeenCalled();
  });

  it('R15 submits the new intake fields for a print order with 3d printing', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(printRadio());
    await user.click(screen.getByRole('radio', { name: 'Delivery' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cliente');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'c@example.com');
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Pieza de prueba');
    await user.type(screen.getByRole('textbox', { name: 'Dimensions' }), '100 x 50 x 20');

    await user.click(screen.getByRole('button', { name: 'Enviar Pedido' }));

    await waitFor(() => expect(api.createPublicOrder).toHaveBeenCalled());
    const payload = sentPayload();
    expect(payload.order_category).toBe('print');
    expect(payload.needs_3d_printing).toBe(true);
    expect(payload.needs_3d_modelling).toBe(false);
    expect(payload.dimensions).toBe('100 x 50 x 20');
    expect(payload.type_of_delivery).toBe('Delivery');
    expect(payload.work_type).toBe('impresion_3d');
  });

  it('R24 print order with only 3d modelling derives work_type diseno_3d', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(printRadio());
    await user.click(printingCheckbox());
    await user.click(modellingCheckbox());
    await user.click(screen.getByRole('radio', { name: 'Delivery' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cliente');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'c@example.com');
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Modelado de prueba');

    await user.click(screen.getByRole('button', { name: 'Enviar Pedido' }));

    await waitFor(() => expect(api.createPublicOrder).toHaveBeenCalled());
    const payload = sentPayload();
    expect(payload.work_type).toBe('diseno_3d');
    expect(payload.needs_3d_printing).toBe(false);
    expect(payload.needs_3d_modelling).toBe(true);
  });
});