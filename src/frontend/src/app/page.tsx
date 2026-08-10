/* Hallmark · macrostructure: Split Diptych (studied-DNA: boneyard.vercel.app/overview)
 * genre: modern-minimal · theme: studied-DNA
 * paper gray-50 · ink gray-900 · accent ember #E4572E
 * display+body: Overpass · labels: Overpass Mono · enrichment: none
 */
'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Button } from '@mui/material';
import Link from 'next/link';

const tallerLinks = [
  { label: 'Pedidos', href: '/dashboard/orders' },
  { label: 'Productos', href: '/dashboard/products' },
  { label: 'Filamentos', href: '/dashboard/stock/filaments' },
  { label: 'Impresoras', href: '/dashboard/printers' },
];

const pasos = [
  {
    num: '01',
    titulo: 'El cliente hace el pedido',
    texto: 'Envía el archivo y el material desde el formulario del taller.',
  },
  {
    num: '02',
    titulo: 'Flayer calcula el presupuesto',
    texto: 'Por gramo, vatio y amortización.',
  },
  {
    num: '03',
    titulo: 'Imprimes y el stock se ajusta',
    texto: 'Los filamentos y materiales se descuentan del inventario.',
  },
];

const capacidades = [
  {
    titulo: 'Presupuestos por peso y energía',
    texto: 'Gramos, vatios y amortización en cada presupuesto.',
  },
  {
    titulo: 'Stock al día',
    texto: 'Filamentos, materiales y movimientos, todos registrados.',
  },
  {
    titulo: 'Un solo lugar',
    texto: 'Pedidos, productos e impresoras en un mismo panel.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">Flayer</span>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate transition-colors hover:text-ink"
        >
          Acceso del taller
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-12 lg:gap-16 lg:py-16">
          <div className="min-w-0 lg:col-span-7">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="contained" component={Link} href="/order-form" size="large">
                Solicitar un pedido
              </Button>
              <Button variant="outlined" component={Link} href="/dashboard" size="large">
                Abrir el dashboard
              </Button>
            </div>
          </div>

          <aside className="card self-start rounded-lg border border-line bg-snow p-2 lg:col-span-5">
            <p className="px-3 py-2 font-mono text-xs font-medium uppercase tracking-widest text-slate">
              En el taller
            </p>
            <ul className="divide-y divide-line">
              {tallerLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-canvas"
                  >
                    {l.label}
                    <ArrowForwardIcon
                      fontSize="inherit"
                      className="h-4 w-4 text-slate transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="p-2">
              <Button
                variant="contained"
                component={Link}
                href="/order-form"
                size="medium"
                fullWidth
              >
                Solicitar un pedido
              </Button>
            </div>
          </aside>
        </section>

        <section className="border-t border-line py-12">
          <div className="mb-10 grid gap-4 lg:grid-cols-12">
            <h2 className="text-2xl font-bold tracking-tight lg:col-span-4">Cómo funciona</h2>
            <p className="max-w-md text-base text-slate lg:col-span-5">
              El día a día del taller en tres pasos.
            </p>
          </div>
          <ol className="grid gap-10 sm:grid-cols-3">
            {pasos.map((p) => (
              <li key={p.num}>
                <span className="font-mono text-sm font-medium text-primary">{p.num}</span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line py-12">
          <ul className="divide-y divide-line">
            {capacidades.map((c) => (
              <li key={c.titulo} className="grid gap-2 py-6 sm:grid-cols-12 sm:gap-4">
                <h3 className="text-lg font-semibold tracking-tight sm:col-span-5">{c.titulo}</h3>
                <p className="text-sm leading-relaxed text-slate sm:col-span-5 sm:col-start-7">
                  {c.texto}
                </p>
              </li>
            ))}
          </ul>
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
