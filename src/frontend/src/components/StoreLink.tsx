'use client';

import { useState } from 'react';
import {
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  TextField,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShareIcon from '@mui/icons-material/Share';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStoreToken, regenerateStoreToken } from '@/app/api';

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
    <div className="card rounded-md border border-line bg-snow p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <ShareIcon color="primary" />
          <h3 className="text-[1.25rem] font-semibold">
            Formulario de pedidos
          </h3>
        </div>

        <p className="text-sm text-slate">
          Comparte este link con tus clientes para que puedan hacer pedidos directamente.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <CircularProgress size={24} />
          </div>
        ) : isError ? (
          <p className="text-sm text-error">
            Error al cargar el link.
          </p>
        ) : data ? (
          <>
            <TextField
              id="store-url"
              value={data.url}
              size="small"
              fullWidth
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                },
              }}
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
            <div className="flex gap-2">
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
            </div>
          </>
        ) : null}
      </div>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </div>
  );
}
