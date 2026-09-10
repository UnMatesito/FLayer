'use client';

import { Button } from '@mui/material';

export function DashboardUnavailableState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-8 text-center">
      <p className="text-[1rem] font-semibold">Servidor no disponible</p>
      <p className="max-w-[28rem] text-sm text-slate">La API parece estar offline o sin responder. Revisá la conexión y reintentá.</p>
      <div className="flex gap-1">
        {onRetry && <Button variant="contained" onClick={onRetry}>Reintentar</Button>}
        <Button href="/dashboard" variant="outlined">Volver</Button>
      </div>
    </div>
  );
}
