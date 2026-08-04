'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Chip, CircularProgress, Grid, IconButton, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import EditIcon from '@mui/icons-material/Edit';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import BoltIcon from '@mui/icons-material/Bolt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PaymentsIcon from '@mui/icons-material/Payments';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPrinters, deletePrinter, type Printer } from '@/app/api';
import { PrinterFormDialog } from '@/components/PrinterFormDialog';
import { PrinterImage } from '@/components/PrinterImage';

const styles: Record<string, SxProps<Theme>> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3,
    flexWrap: 'wrap', gap: 1,
  },
  card: {
    display: 'flex', flexDirection: 'column', cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
    '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
  },
  image: {
    height: 160,
    width: '100%',
  },
  brandLine: {
    color: 'text.secondary', fontSize: '0.85rem', mb: 1,
  },
  paramRow: {
    display: 'flex', alignItems: 'center', gap: 1,
  },
  paramValue: {
    fontWeight: 600, fontSize: '0.9rem',
  },
  paramIcon: {
    fontSize: 16, color: 'text.disabled',
  },
  actions: {
    justifyContent: 'space-between', px: 2, pb: 1.5,
  },
};

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function PrinterCard({ printer, onEdit, onArchive }: {
  printer: Printer; onEdit: (p: Printer) => void; onArchive: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <Card sx={styles.card} onClick={() => router.push(`/dashboard/printers/${printer.id}`)}>
      <PrinterImage src={printer.image_url} alt={printer.name} sx={styles.image} iconSize={64} />
      <CardContent sx={{ flexGrow: 1, pb: 0 }}>
        <Typography variant="h6" fontWeight={600} lineHeight={1.2} noWrap>
          {printer.name}
        </Typography>
        <Typography sx={styles.brandLine}>
          {[printer.brand, printer.model].filter(Boolean).join(' · ') || 'Marca no especificada'}
        </Typography>
        {printer.nozzle_sizes.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            {printer.nozzle_sizes.map((n) => (
              <Chip key={n} label={`${n} mm`} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
        <Stack spacing={0.75}>
          <Box sx={styles.paramRow}>
            <BoltIcon sx={styles.paramIcon} />
            <Typography sx={styles.paramValue}>
              {printer.power_watts != null ? `${printer.power_watts} W` : '—'}
            </Typography>
          </Box>
          <Box sx={styles.paramRow}>
            <ScheduleIcon sx={styles.paramIcon} />
            <Typography sx={styles.paramValue}>
              {printer.lifespan_hours != null ? `${printer.lifespan_hours} h` : '—'}
            </Typography>
          </Box>
          <Box sx={styles.paramRow}>
            <PaymentsIcon sx={styles.paramIcon} />
            <Typography sx={styles.paramValue}>{formatMoney(printer.spare_parts_cost)}</Typography>
          </Box>
        </Stack>
      </CardContent>
      <CardActions sx={styles.actions} onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" color="primary" title="Editar" onClick={() => onEdit(printer)}>
          <EditIcon />
        </IconButton>
        <IconButton size="small" color="error" title="Archivar"
          onClick={() => { if (confirm('¿Archivar esta impresora?')) onArchive(printer.id); }}>
          <ArchiveIcon />
        </IconButton>
      </CardActions>
    </Card>
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={styles.header}>
        <Typography variant="h5" fontWeight={600}>Impresoras</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
          Agregar impresora
        </Button>
      </Box>

      {!printers || printers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ThreeDRotationIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">No hay impresoras registradas.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {printers.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <PrinterCard
                printer={p}
                onEdit={(printer) => setEditing(printer)}
                onArchive={(id) => archiveMutation.mutate(id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <PrinterFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && (
        <PrinterFormDialog open onClose={() => setEditing(null)} printer={editing} />
      )}
    </Box>
  );
}
