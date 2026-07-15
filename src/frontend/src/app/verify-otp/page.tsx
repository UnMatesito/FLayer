'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import { useAuth } from '../auth-context';
import { sendOtp } from '../api';

export default function VerifyOtpPage() {
  const { verifyOtp } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(code);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    try {
      await sendOtp();
      setMessage('Código reenviado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Verificación
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Ingresa el código de verificación que enviamos a tu correo.
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
            <TextField
              label="Código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              fullWidth
              autoFocus
              inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              placeholder="123456"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
            <Button variant="text" onClick={handleResend} disabled={loading}>
              Reenviar código
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
