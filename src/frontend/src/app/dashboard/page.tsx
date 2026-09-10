'use client';

import { useRouter } from 'next/navigation';
import { Button, Skeleton, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ProtectedRoute from '../protected-route';
import { useAuth } from '../auth-context';
import { fetchDashboardSummary, type DashboardKpis, type DashboardSummary } from '../api';
import LayerBarChart from '@/components/LayerBarChart';
import { statusColor, statusLabel, workTypeLabel } from '@/utils/order';
import { DashboardUnavailableState } from './unavailable-state';

function formatMoney(value: number): string {
  return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function statusSentence(kpis: DashboardKpis): string {
  const parts: string[] = [];
  if (kpis.printing_orders > 0) {
    parts.push(`${kpis.printing_orders} impresiones en curso`);
  }
  if (kpis.pending_orders > 0) {
    parts.push(`${kpis.pending_orders} en cola`);
  }
  if (kpis.low_stock_filaments > 0) {
    parts.push(`${kpis.low_stock_filaments} ${kpis.low_stock_filaments === 1 ? 'filamento' : 'filamentos'} por reponer`);
  }
  if (kpis.low_stock_supplies > 0) {
    parts.push(`${kpis.low_stock_supplies} ${kpis.low_stock_supplies === 1 ? 'insumo' : 'insumos'} por reponer`);
  }
  if (kpis.low_stock_products > 0) {
    parts.push(`${kpis.low_stock_products} ${kpis.low_stock_products === 1 ? 'producto' : 'productos'} sin stock`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'nada en cola y el stock normal';
}

function greeting(firstName: string, kpis: DashboardKpis): string {
  return `Buen día, ${firstName} — ${statusSentence(kpis)}`;
}

function KpiCell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="border-line p-2.5 [&:nth-of-type(odd)]:border-r sm:border-r sm:last:border-r-0">
      <div
        className={`font-mono text-[2.1rem] font-medium leading-[1.1] tabular-nums ${accent ? 'text-primary' : 'text-ink'}`}
      >
        {value}
      </div>
      <span className="mt-1 block text-[0.78rem] font-medium text-slate">
        {label}
      </span>
      {sub && <p className="mt-0.5 text-[0.8rem] text-slate">{sub}</p>}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 py-4">
      <div className="flex flex-wrap items-end justify-between gap-1.5">
        <div>
          <Skeleton variant="text" width={220} height={44} />
          <Skeleton variant="text" width={300} />
        </div>
        <Skeleton variant="text" width={90} />
      </div>
      <Skeleton variant="rounded" height={190} sx={{ borderRadius: 2 }} />
      <div className="grid grid-cols-2 overflow-hidden card rounded-md border border-line bg-snow sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-2.5">
            <Skeleton variant="text" width={90} height={40} />
            <Skeleton variant="text" width={120} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1.35fr_1fr]">
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
      </div>
    </div>
  );
}

function DashboardBody({ summary, name }: { summary: DashboardSummary; name: string }) {
  const router = useRouter();
  const { kpis } = summary;
  const firstName = name.split(' ')[0];
  const isBlankWeek = kpis.orders_month === 0 && summary.recent_orders.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 py-4">
      <div className="flex flex-wrap items-end justify-between gap-1.5">
        <div>
          <h1 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.01em]">Vista general</h1>
          <p className="mt-0.75 text-[0.95rem] text-slate">{greeting(firstName, kpis)}</p>
        </div>
        <p className="font-mono text-[0.8rem] capitalize text-slate">
          {new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
        </p>
      </div>

      <div className="card rounded-md border border-line bg-snow p-4">
        {isBlankWeek ? (
          <div className="flex flex-col items-start gap-1.5 px-1 py-3">
            <p className="text-[1.15rem] font-bold leading-[1.2] tracking-[-0.01em]">
              La semana está en blanco
            </p>
            <p className="max-w-[340px] text-sm text-slate">
              Creá tu primer pedido para que la actividad empiece a dibujarse acá.
            </p>
            <Button variant="contained" onClick={() => router.push('/dashboard/orders')} className="mt-1">
              Crear pedido
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-1.5 text-[0.95rem] font-semibold">
              Actividad · últimos 14 días
            </p>
            <LayerBarChart data={summary.activity} />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 overflow-hidden card rounded-md border border-line bg-snow sm:grid-cols-4">
        <KpiCell label="Pedidos del mes" value={String(kpis.orders_month)} />
        <KpiCell label="Ingresos del mes" value={formatMoney(kpis.revenue_month)} accent />
        <KpiCell
          label="En cola"
          value={String(kpis.pending_orders)}
          sub={kpis.printing_orders > 0 ? `+${kpis.printing_orders} a la impresora` : 'nada imprimiendo'}
        />
        <KpiCell
          label="Stock bajo"
          value={String(kpis.low_stock_products + kpis.low_stock_filaments + kpis.low_stock_supplies)}
          sub={`${kpis.low_stock_products} prod · ${kpis.low_stock_filaments} fil · ${kpis.low_stock_supplies} insumo${kpis.low_stock_supplies === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1.35fr_1fr]">
        <div className="card rounded-md border border-line bg-snow p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[0.95rem] font-semibold">
              En el taller
            </p>
            <Button size="small" variant="outlined" onClick={() => router.push('/dashboard/orders')}>
              + Nuevo pedido
            </Button>
          </div>

          {summary.recent_orders.length === 0 ? (
            <p className="py-3 text-[0.9rem] text-slate">No hay pedidos activos.</p>
          ) : (
            summary.recent_orders.map((order) => (
              <div
                key={order.id}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md border-b border-line px-1 py-1.75 last:border-b-0 hover:bg-plate"
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
              >
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] font-medium">{order.customer_name}</p>
                  <p className="font-mono text-[0.78rem] text-ink">
                    #{order.short_id} · {workTypeLabel(order.work_type)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <p className="font-mono text-[0.72rem] text-slate">
                    {new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(order.created_at))}
                  </p>
                  <Chip
                    label={statusLabel(order.status)}
                    color={statusColor(order.status) as 'info' | 'warning' | 'success' | 'error' | 'default'}
                    size="small"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="card rounded-md border border-line bg-snow p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[0.95rem] font-semibold">
                Stock bajo
              </p>
              <Button size="small" component="a" href="/dashboard/stock/filaments">
                Ir a stock
              </Button>
            </div>
            {summary.low_stock.items.length === 0 ? (
              <p className="py-2 text-[0.9rem] text-slate">Stock normal: todo por encima del mínimo.</p>
            ) : (
              <>
                {summary.low_stock.products.map((p) => (
                  <div key={p.id} className="flex justify-between gap-2 border-b border-line py-1.25 last:border-b-0">
                    <p className="truncate text-[0.85rem]">Producto · {p.name}</p>
                    <p className="whitespace-nowrap font-mono text-[0.72rem] text-slate">
                      {p.stock_quantity}/{p.threshold} uds.
                    </p>
                  </div>
                ))}
                {summary.low_stock.filaments.map((f) => (
                  <div key={f.id} className="flex justify-between gap-2 border-b border-line py-1.25 last:border-b-0">
                    <p className="truncate text-[0.85rem]">{f.color_name}</p>
                    <p className="whitespace-nowrap font-mono text-[0.72rem] text-slate">
                      {f.weight_grams}/{f.min_stock_warning_grams}g
                    </p>
                  </div>
                ))}
                {summary.low_stock.supplies.map((s) => (
                  <div key={s.id} className="flex justify-between gap-2 border-b border-line py-1.25 last:border-b-0">
                    <p className="truncate text-[0.85rem]">{s.name}</p>
                    <p className="whitespace-nowrap font-mono text-[0.72rem] text-slate">
                      {s.quantity}/{s.min_stock_warning} {s.unit}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="card rounded-md border border-line bg-snow p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[0.95rem] font-semibold">
                Impresoras
              </p>
              <Button size="small" component="a" href="/dashboard/printers">
                Ir a impresoras
              </Button>
            </div>
            {summary.printers.length === 0 ? (
              <p className="py-2 text-[0.9rem] text-slate">No hay impresoras activas.</p>
            ) : (
              <>
                <p className="mb-0.5 text-[0.82rem] text-slate">
                  {kpis.printers_active} activas · {kpis.maintenance_month}{' '}
                  {kpis.maintenance_month === 1 ? 'mantenimiento' : 'mantenimientos'} este mes
                </p>
                <div className="flex flex-wrap gap-1 pt-0.75">
                  {summary.printers.map((p) => (
                    <Chip
                      key={p.id}
                      label={`${p.name}${p.maintenance_month > 0 ? ` · ${p.maintenance_month} mto.` : ''}`}
                      size="small"
                      variant={p.maintenance_month > 0 ? 'outlined' : 'filled'}
                      color={p.maintenance_month > 0 ? 'warning' : 'default'}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  return (
    <ProtectedRoute>
      <div>
        {isLoading ? (
          <SummarySkeleton />
        ) : isError || !data ? (
          <DashboardUnavailableState onRetry={() => void refetch()} />
        ) : (
          <DashboardBody summary={data} name={user?.name ?? ''} />
        )}
      </div>
    </ProtectedRoute>
  );
}
