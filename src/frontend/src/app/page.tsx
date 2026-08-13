'use client';

import { Button } from '@mui/material';
import Link from 'next/link';
import { FlayerLogo } from '@/components/FlayerLogo';

const nozzlePath =
  'M365.099,236.326C359.857,239.368 314.396,234.909 310.769,238.751C310.752,238.769 248.258,310.244 246.353,312.37C240.932,318.421 238.743,322.702 234.501,322.713C194.798,322.81 194.603,322.458 193.606,321.397C192.142,319.836 128.972,247.471 125.446,243.548C122.537,240.311 121.146,237.304 117.502,237.288C69.22,237.076 66.723,238.58 66.714,234.498C66.692,224.585 66.441,111.895 66.814,110.588C67.761,107.273 107.492,111.093 109.098,108.326C109.697,107.293 108.802,4.562 109.583,3.547C110.296,2.62 110.603,2.713 317.5,2.714C324.357,2.714 322.714,5.619 322.714,12.5C322.716,108.028 322.57,108.457 323.674,109.098C325.489,110.151 364.364,107.711 365.186,110.588C365.286,110.937 365.478,232.624 365.099,236.326ZM151.966,151.5C152.389,96.311 151.335,46.728 152.649,45.683C153.477,45.025 278.523,45.025 279.351,45.683C280.884,46.903 279.633,150.039 280.034,151.5C280.529,153.301 321.914,149.971 322.665,153.467C322.688,153.575 322.866,192.592 322.563,193.523C321.588,196.525 292.395,193.002 289.751,195.756C288.945,196.595 257.109,233.177 252.39,238.404C217.456,277.104 217.645,281.576 214.615,278.385C212.856,276.534 166.364,223.064 160.92,217.131C159.503,215.587 146.345,200.326 145.081,198.861C139.433,192.31 136.475,195.175 111.484,194.706C108.263,194.645 108.668,192.806 109.287,154.495C109.344,150.921 112.155,152.198 149.495,152.034C151.022,152.028 151.839,151.527 151.966,151.5Z';

const manualEntries = [
  {
    titulo: 'Solicitar un pedido',
    pasos: [
      'Abre el panel del taller (tras iniciar sesión) y copia el enlace del taller desde la página de Pedidos.',
      'Envía ese enlace al cliente: lleva un token que identifica tu taller.',
      'El cliente abre el enlace, completa el formulario y envía su pedido.',
      'También puedes registrar un pedido a mano desde el panel, en Pedidos.',
    ],
  },
  {
    titulo: 'Presupuesto',
    pasos: [
      'Configura los valores del presupuesto por moneda — costo por gramo, por vatio-hora y la amortización — dentro del panel.',
      'Cada pedido calcula su presupuesto con esos valores.',
      'Revisa el desglose y comparte o guarda el presupuesto.',
    ],
  },
  {
    titulo: 'Pedidos',
    pasos: [
      'Los pedidos aparecen en la tabla de Pedidos al crearlos o cuando un cliente envía el formulario público.',
      'Abre un pedido para ver el desglose, ajustar cantidades y gestionar el estado: nuevo, en progreso, completado o cancelado.',
      'El estado del pedido se actualiza en tiempo real para que siempre tengas el seguimiento al día.',
    ],
  },
  {
    titulo: 'Productos',
    pasos: [
      'Crea productos con nombre, precio y descripción desde la página de Productos.',
      'Sube una imagen para cada producto y define su stock disponible.',
      'Los clientes pueden seleccionar productos al hacer pedido desde el formulario público.',
      'Archiva productos que ya no ofreces; se pueden restaurar desde el toggle "Archivados".',
    ],
  },
  {
    titulo: 'Stock',
    pasos: [
      'Registra tus filamentos e insumos con su cantidad, peso y mínimo.',
      'Cada pedido descuenta el material del inventario.',
      'Consulta los movimientos en Historial; los chips marcan el material bajo mínimo.',
    ],
  },
  {
    titulo: 'Impresoras',
    pasos: [
      'Registra cada impresora con su marca, modelo y consumo, dentro del panel.',
      'Mantén al día su estado: activa o en mantenimiento.',
    ],
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="Flayer — inicio" className="block">
          <FlayerLogo size={24} />
        </Link>
        <Link
          href="/dashboard"
          className="whitespace-nowrap text-sm font-medium text-slate transition-colors hover:text-ink"
        >
          Acceso del taller
        </Link>
      </header>

      <section className="relative overflow-hidden bg-plate pb-14 pt-12 lg:pb-20 lg:pt-16">
        <div aria-hidden className="absolute bottom-2 left-0 right-70 h-12 bg-[var(--color-primary)] rounded-r-full" />
        <svg
          aria-hidden
          className="pointer-events-none absolute right-20 bottom-[110px] w-100 hidden lg:block"
          viewBox="0 0 512 323"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={nozzlePath} fill="var(--color-primary)" fillRule="evenodd" />
        </svg>
        <div className="relative mx-auto max-w-5xl px-6">
          <p className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-primary">
            Impresión 3D · bajo pedido
          </p>
          <h1 className="max-w-lg break-words text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Pedidos que se imprimen, no que se pierden.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate">
            Flayer ordena las solicitudes de tus clientes, calcula presupuestos
            por gramo y vatio, y lleva el stock de filamentos al día.
          </p>
          <div className="mt-8">
            <Button variant="contained" component={Link} href="/dashboard" size="large">
              Abrir el dashboard
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="pb-8 pt-18">
          <h2 className="text-2xl font-bold tracking-tight">Manual de uso</h2>
          <p className="mt-2 max-w-md text-base text-slate">
            Cómo usar el taller, paso a paso.
          </p>
          <div className="mt-4 divide-y divide-line">
            {manualEntries.map((entry) => (
              <details key={entry.titulo} className="group">
                <summary className="flex cursor-pointer select-none items-center justify-between gap-4 py-4 text-base font-semibold tracking-tight transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  {entry.titulo}
                  <span
                    aria-hidden
                    className="shrink-0 text-slate transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <ol className="flex flex-col gap-2 pb-4">
                  {entry.pasos.map((paso, i) => (
                    <li key={paso} className="flex gap-3 text-sm leading-relaxed text-slate">
                      <span className="shrink-0 font-mono text-xs font-medium pt-0.5 text-primary">
                        {i + 1}
                      </span>
                      {paso}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-2 px-6 py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-slate">Presupuestos por peso, energía y amortización.</p>
          <p className="font-mono text-xs text-slate">Un taller, un lugar para todo.</p>
        </div>
      </footer>
    </div>
  );
}