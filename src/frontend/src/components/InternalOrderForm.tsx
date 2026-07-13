'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  Checkbox,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInternalOrder } from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    maxWidth: 600,
  },
  field: {
    width: '100%',
  },
};

interface Props {
  token: string;
  onSuccess?: () => void;
}

export default function InternalOrderForm({ token, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState<'impresion_3d' | 'diseno_3d'>('impresion_3d');
  const [description, setDescription] = useState('');
  const [skipNotification, setSkipNotification] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createInternalOrder>[0]) =>
      createInternalOrder(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      customer: { name: name.trim(), email, phone },
      work_type: workType,
      description: description.trim(),
      skip_client_notification: skipNotification,
    });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setWorkType('impresion_3d');
    setDescription('');
    setSkipNotification(false);
  };

  if (mutation.isSuccess) {
    return (
      <Box sx={styles.container}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Pedido creado exitosamente.
        </Alert>
        <Button variant="outlined" onClick={resetForm}>
          Crear Otro
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={styles.container} component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Nuevo Pedido (Interno)
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          sx={styles.field}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={styles.field}
        />
        <TextField
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          sx={styles.field}
        />

        <FormControl>
          <FormLabel>Tipo de trabajo</FormLabel>
          <RadioGroup
            value={workType}
            onChange={(e) =>
              setWorkType(e.target.value as 'impresion_3d' | 'diseno_3d')
            }
          >
            <FormControlLabel
              value="impresion_3d"
              control={<Radio />}
              label="Impresión 3D"
            />
            <FormControlLabel
              value="diseno_3d"
              control={<Radio />}
              label="Diseño 3D"
            />
          </RadioGroup>
        </FormControl>

        <TextField
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          multiline
          rows={4}
          sx={styles.field}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={skipNotification}
              onChange={(e) => setSkipNotification(e.target.checked)}
            />
          }
          label="Cliente ya notificado (no enviar email)"
        />

        {mutation.isError && (
          <Alert severity="error">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Error al crear el pedido'}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={mutation.isPending}
          startIcon={
            mutation.isPending ? <CircularProgress size={20} /> : undefined
          }
        >
          {mutation.isPending ? 'Creando...' : 'Crear Pedido'}
        </Button>
      </Stack>
    </Box>
  );
}
