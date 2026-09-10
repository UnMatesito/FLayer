'use client';

import { Button } from '@mui/material';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-3">
      <div className="card max-w-[560px] rounded-md border border-line bg-snow p-5 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-slate">Error</p>
        <h2 className="mt-1 text-[1.6rem] font-bold leading-tight">Algo falló en el panel</h2>
        <p className="mt-1 text-sm text-slate">No mostramos detalles técnicos para proteger la operación. Podés reintentar sin perder el contexto general.</p>
        <div className="mt-3 flex justify-center gap-1">
          <Button variant="contained" onClick={reset}>Reintentar</Button>
          <Button href="/dashboard" variant="outlined">Volver</Button>
        </div>
      </div>
    </div>
  );
}
