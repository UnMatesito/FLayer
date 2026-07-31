'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Stack,
  Snackbar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShareIcon from '@mui/icons-material/Share';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStoreToken, regenerateStoreToken } from '@/app/api';

const styles: Record<string, SxProps<Theme>> = {
  container: { p: 3 },
  urlField: {
    '& .MuiInputBase-root': {
      fontFamily: 'monospace',
      fontSize: '0.85rem',
    },
  },
};

export default function StoreLink() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store-token'],
    queryFn: fetchStoreToken,
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateStoreToken,
    onSuccess: (newData) => {
      queryClient.setQueryData(['store-token'], newData);
    },
  });

  const copyToClipboard = async () => {
    if (!data?.url) return;
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
    } catch {
      const input = document.querySelector<HTMLInputElement>('#store-url');
      input?.select();
    }
  };

  return (
    <Paper sx={styles.container}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShareIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Formulario de pedidos
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Comparte este link con tus clientes para que puedan hacer pedidos directamente.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : isError ? (
          <Typography color="error" variant="body2">
            Error al cargar el link.
          </Typography>
        ) : data ? (
          <>
            <TextField
              id="store-url"
              value={data.url}
              size="small"
              fullWidth
              sx={styles.urlField}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={copyToClipboard} size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={copyToClipboard}
              >
                {copied ? 'Copiado' : 'Copiar link'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                {regenerateMutation.isPending ? 'Regenerando...' : 'Regenerar token'}
              </Button>
            </Stack>
          </>
        ) : null}
      </Stack>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}
