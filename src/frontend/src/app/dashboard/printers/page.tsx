'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Chip, CircularProgress, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import EditIcon from '@mui/icons-material/Edit';
import BoltIcon from '@mui/icons-material/Bolt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPrinters, deletePrinter, type Printer } from '@/app/api';
import { PrinterFormDialog } from '@/components/PrinterFormDialog';
import { PrinterImage } from '@/components/PrinterImage';

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function PrinterCard({ printer, onEdit, onArchive }: {
  printer: Printer; onEdit: (p: Printer) => void; onArchive: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden card rounded-md border border-line bg-snow transition-colors hover:border-slate/60"
      onClick={() => router.push(`/dashboard/printers/${printer.id}`)}
    >
      <PrinterImage src={printer.image_url} alt={printer.name} className="h-[160px] w-full" iconSize={64} />
      <div className="flex flex-1 flex-col p-2 pb-0">
        <h3 className="truncate text-[1.25rem] font-semibold leading-[1.2]">
          {printer.name}
        </h3>
        <p className="mb-1 text-[0.85rem] text-slate">
          {[printer.brand, printer.model].filter(Boolean).join(' · ') || 'Marca no especificada'}
        </p>
        {printer.nozzle_sizes.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-0.5">
            {printer.nozzle_sizes.map((n) => (
              <Chip key={n} label={`${n} mm`} size="small" variant="outlined" />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-0.75">
          <div className="flex items-center gap-1">
            <BoltIcon sx={{ fontSize: 16 }} className="text-slate" />
            <p className="text-[0.9rem] font-semibold">
              {printer.power_watts != null ? `${printer.power_watts} W` : '—'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ScheduleIcon sx={{ fontSize: 16 }} className="text-slate" />
            <p className="text-[0.9rem] font-semibold">
              {printer.lifespan_hours != null ? `${printer.lifespan_hours} h` : '—'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <PaymentsIcon sx={{ fontSize: 16 }} className="text-slate" />
            <p className="text-[0.9rem] font-semibold">{formatMoney(printer.spare_parts_cost)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 pb-1.5" onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" color="primary" title="Editar" onClick={() => onEdit(printer)}>
          <EditIcon />
        </IconButton>
        <IconButton size="small" color="error" title="Archivar"
          onClick={() => { if (confirm('¿Archivar esta impresora?')) onArchive(printer.id); }}>
          <ArchiveIcon />
        </IconButton>
      </div>
    </div>
  );
}

export default function PrintersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Printer | null>(null);

  const { data: printers, isLoading } = useQuery<Printer[]>({
    queryKey: ['printers'],
    queryFn: fetchPrinters,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => deletePrinter(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printers'] }),
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><CircularProgress /></div>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
        <h2 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">Impresoras</h2>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
          Agregar impresora
        </Button>
      </div>

      {!printers || printers.length === 0 ? (
        <p className="py-6 text-sm text-slate">No hay impresoras registradas.</p>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          {printers.map((p) => (
            <div key={p.id} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
              <PrinterCard
                printer={p}
                onEdit={(printer) => setEditing(printer)}
                onArchive={(id) => archiveMutation.mutate(id)}
              />
            </div>
          ))}
        </div>
      )}

      <PrinterFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && (
        <PrinterFormDialog open onClose={() => setEditing(null)} printer={editing} />
      )}
    </div>
  );
}
