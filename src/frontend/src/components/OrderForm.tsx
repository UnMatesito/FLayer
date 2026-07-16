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
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { createPublicOrder, type FileInfo } from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    maxWidth: 600,
    mx: 'auto',
    p: 4,
  },
  field: {
    width: '100%',
  },
};

export default function OrderForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState<'impresion_3d' | 'diseno_3d'>('impresion_3d');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const mutation = useMutation({
    mutationFn: (data: {
      customer: { name: string; email: string; phone: string };
      work_type: 'impresion_3d' | 'diseno_3d';
      description: string;
      files?: FileInfo[];
    }) => createPublicOrder(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const files: FileInfo[] | undefined =
      fileUrl && fileName
        ? [{ filename: fileName, url: fileUrl }]
        : undefined;

    mutation.mutate({
      customer: { name: name.trim(), email, phone },
      work_type: workType,
      description: description.trim(),
      files,
    });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setWorkType('impresion_3d');
    setDescription('');
    setFileUrl('');
    setFileName('');
    mutation.reset();
  };

  if (mutation.isSuccess) {
    return (
      <Box sx={styles.container}>
        <Alert severity="success" sx={{ mb: 2 }}>
          ¡Pedido recibido! Te contactaremos pronto.
        </Alert>
        <Button variant="outlined" onClick={resetForm}>
          Nuevo Pedido
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={styles.container} component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Solicitar Pedido
      </Typography>

      <Stack spacing={3}>
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

        <Typography variant="subtitle2" color="text.secondary">
          Archivo (opcional) — Enlace a Drive, WeTransfer, etc.
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Nombre del archivo"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="URL del archivo"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
          />
        </Stack>

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
          startIcon={mutation.isPending ? <CircularProgress size={20} /> : undefined}
        >
          {mutation.isPending ? 'Enviando...' : 'Enviar Pedido'}
        </Button>
      </Stack>
    </Box>
  );
}
