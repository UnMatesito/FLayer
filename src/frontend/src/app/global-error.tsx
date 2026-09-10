'use client';

import { Button } from '@mui/material';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-canvas p-3">
          <div className="card max-w-[560px] rounded-md border border-line bg-snow p-5 text-center">
            <p className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-slate">Error global</p>
            <h1 className="mt-1 text-[1.8rem] font-bold leading-tight">Flayer no pudo renderizar esta vista</h1>
            <p className="mt-1 text-sm text-slate">El servidor o el navegador encontraron un problema inesperado. No se muestran objetos, stack traces ni datos crudos.</p>
            <Button variant="contained" onClick={reset} sx={{ mt: 3 }}>Reintentar</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
