import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-3">
      <div className="card max-w-[520px] rounded-md border border-line bg-snow p-5 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-slate">404</p>
        <h1 className="mt-1 text-[1.8rem] font-bold leading-tight">No encontramos esta página</h1>
        <p className="mt-1 text-sm text-slate">El recurso puede haber sido movido, archivado o no existir para tu taller.</p>
        <Link href="/dashboard" className="mt-3 inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-[var(--mui-palette-primary-contrastText)]">
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
