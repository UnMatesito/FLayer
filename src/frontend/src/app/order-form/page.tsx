'use client';

import { Suspense } from 'react';
import { CircularProgress } from '@mui/material';
import OrderForm from '@/components/OrderForm';

function OrderFormFallback() {
  return (
    <div className="flex justify-center p-4">
      <CircularProgress />
    </div>
  );
}

export default function OrderFormPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4">
      <Suspense fallback={<OrderFormFallback />}>
        <OrderForm />
      </Suspense>
    </div>
  );
}
