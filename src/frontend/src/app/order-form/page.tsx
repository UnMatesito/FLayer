'use client';

import { Container } from '@mui/material';
import OrderForm from '@/components/OrderForm';

export default function OrderFormPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <OrderForm />
    </Container>
  );
}
