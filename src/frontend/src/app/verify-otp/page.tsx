'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, TextField, Alert } from '@mui/material';
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
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="card rounded-md border border-line bg-snow p-4">
        <h2 className="mb-2 text-[1.5rem] font-semibold">
          Verificación
        </h2>
        <p className="mb-3 text-sm text-slate">
          Ingresa el código de verificación que enviamos a tu correo.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
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
          </div>
        </form>
      </div>
    </div>
  );
}
