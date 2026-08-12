'use client';

import OrdersTable from '@/components/OrdersTable';
import InternalOrderForm from '@/components/InternalOrderForm';
import StoreLink from '@/components/StoreLink';

export default function OrdersHubPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <h1 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">Pedidos</h1>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <StoreLink />

          <div className="card rounded-md border border-line bg-snow p-4">
            <InternalOrderForm />
          </div>
        </div>

        <OrdersTable />
      </div>
    </div>
  );
}