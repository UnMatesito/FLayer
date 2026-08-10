'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../auth-context';
import { removeLogo, updateProfile, uploadLogo, type User } from '../../api';
import { EMBER } from '../../theme';

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_LOGO_BYTES = 10 * 1024 * 1024;

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-0.5 text-[0.78rem] text-error">
      {message}
    </p>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [hex, setHex] = useState(user?.primary_color ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [hexError, setHexError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setHex(user?.primary_color ?? '');
  }, [user?.name, user?.primary_color]);

  const nameMutation = useMutation({
    mutationFn: (newName: string) => updateProfile({ name: newName }),
    onSuccess: (updated: User) => {
      setName(updated.name);
      void refreshUser();
    },
    onError: (err: Error) => setNameError(err.message),
  });

  const colorMutation = useMutation({
    mutationFn: (value: string | null) => updateProfile({ primary_color: value }),
    onSuccess: (updated: User) => {
      setHex(updated.primary_color ?? '');
      void refreshUser();
    },
    onError: (err: Error) => setHexError(err.message),
  });

  const logoMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: (updated: User) => {
      setLogoError(null);
      void refreshUser();
      if (updated.logo_url) setHex(updated.primary_color ?? '');
    },
    onError: (err: Error) => setLogoError(err.message),
  });

  const removeLogoMutation = useMutation({
    mutationFn: removeLogo,
    onSuccess: () => void refreshUser(),
    onError: (err: Error) => setLogoError(err.message),
  });

  const handleSaveName = () => {
    setNameError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('El nombre no puede estar vacío.');
      return;
    }
    nameMutation.mutate(trimmed);
  };

  const handleSaveColor = () => {
    setHexError(null);
    const value = hex.trim();
    if (value === '') {
      colorMutation.mutate(null);
      return;
    }
    if (!HEX_PATTERN.test(value)) {
      setHexError('El color debe tener el formato #RRGGBB.');
      return;
    }
    colorMutation.mutate(value.toUpperCase());
  };

  const handlePickFile = (file: File | undefined) => {
    setLogoError(null);
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLogoError('Solo se aceptan imágenes jpeg, png o webp.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('La imagen no puede superar los 10 MB.');
      return;
    }
    logoMutation.mutate(file);
  };

  const previewColor = HEX_PATTERN.test(hex) ? hex.toUpperCase() : user?.primary_color ?? EMBER;

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-3">
      <h1 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">
        Mi perfil
      </h1>

      <div className="card rounded-md border border-line bg-snow p-4">
        <p className="mb-2 text-[0.95rem] font-semibold">
          Nombre
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
            error={!!nameError}
            slotProps={{ inputLabel: { shrink: true } }}
            className="max-w-[380px]"
          />
          <Button
            variant="contained"
            onClick={handleSaveName}
            disabled={nameMutation.isPending || name.trim() === (user?.name ?? '')}
            startIcon={nameMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Guardar
          </Button>
        </div>
        {nameError && <FieldError message={nameError} />}
        <p className="mt-1 text-[0.8rem] text-slate">
          Aparece en el saludo de la página de inicio.
        </p>
      </div>

      <div className="card rounded-md border border-line bg-snow p-4">
        <p className="mb-2 text-[0.95rem] font-semibold">
          Color de acento
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="block">
              <input
                type="color"
                value={previewColor}
                onChange={(e) => setHex(e.target.value.toUpperCase())}
                aria-label="Elegir color de acento"
                className="h-[40px] w-[40px] cursor-pointer rounded-md border border-line bg-transparent p-0"
              />
            </label>
            <TextField
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              placeholder="#E4572E"
              size="small"
              error={!!hexError}
              slotProps={{ htmlInput: { className: 'font-mono' }, inputLabel: { shrink: true } }}
            />
          </div>
          <Button
            variant="contained"
            onClick={handleSaveColor}
            disabled={colorMutation.isPending}
            startIcon={colorMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Guardar
          </Button>
        </div>
        {hexError && <FieldError message={hexError} />}
        <p className="mt-1 text-[0.8rem] text-slate">
          Vacío restaura el color por defecto. Se aplica a la barra de hoy del gráfico y a la
          navegación al instante.
        </p>
      </div>

      <div className="card rounded-md border border-line bg-snow p-4">
        <p className="mb-2 text-[0.95rem] font-semibold">
          Logotipo
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {user?.logo_url ? (
            <img src={user.logo_url} alt="Logotipo actual" className="h-[44px] max-w-[200px] object-contain" />
          ) : (
            <p className="text-[0.9rem] text-slate">
              Sin logotipo — se muestra la marca Flayer.
            </p>
          )}
          <div className="flex gap-1">
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={logoMutation.isPending}>
              Subir logo
            </Button>
            {user?.logo_url && (
              <Button
                variant="text"
                color="error"
                onClick={() => removeLogoMutation.mutate()}
                disabled={removeLogoMutation.isPending}
              >
                Quitar logo
              </Button>
            )}
          </div>
        </div>
        {logoError && <FieldError message={logoError} />}
        <p className="mt-1 text-[0.8rem] text-slate">
          jpeg, png o webp, hasta 10 MB. Reemplaza la marca en la barra lateral y en la barra superior.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => handlePickFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
