'use client';

import { Suspense } from 'react';
import { Container, CircularProgress, Box } from '@mui/material';
import OrderForm from '@/components/OrderForm';

function OrderFormFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export default function OrderFormPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Suspense fallback={<OrderFormFallback />}>
        <OrderForm />
      </Suspense>
    </Container>
  );
}
