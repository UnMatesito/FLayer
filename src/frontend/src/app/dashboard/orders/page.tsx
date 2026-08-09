'use client';

import OrdersTable from '@/components/OrdersTable';
import InternalOrderForm from '@/components/InternalOrderForm';
import StoreLink from '@/components/StoreLink';

export default function OrdersHubPage() {
  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-3">
      <h1 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">Pedidos</h1>

      <StoreLink />

      <div className="card rounded-md border border-line bg-snow p-4">
        <InternalOrderForm />
      </div>

      <div className="card rounded-md border border-line bg-snow p-4">
        <h3 className="mb-2 text-[1.25rem] font-semibold">Todos los pedidos</h3>
        <OrdersTable />
      </div>
    </div>
  );
}
