'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth-context';
import {
  fetchBudgetParameters,
  removeLogo,
  updateBudgetParameters,
  updateProfile,
  updateUserCurrency,
  uploadLogo,
  CURRENCY_OPTIONS,
  type BudgetParametersBundle,
  type BudgetParametersUpdate,
  type Currency,
  type User,
} from '../../api';
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

function MakerParametersBlock() {
  const { user, refreshUser } = useAuth();
  const [activeCurrency, setActiveCurrency] = useState<Currency>('ARS');
  const [activeTouched, setActiveTouched] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(user?.currency ?? 'ARS');
  const [defaultTouched, setDefaultTouched] = useState(false);
  const [values, setValues] = useState<Record<Currency, BudgetParametersUpdate> | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!defaultTouched && user?.currency) {
      setDefaultCurrency(user.currency);
    }
    if (!activeTouched && !defaultTouched && user?.currency) {
      setActiveCurrency(user.currency);
    }
  }, [user?.currency, defaultTouched, activeTouched]);

  const { data, isLoading } = useQuery({
    queryKey: ['budget-parameters'],
    queryFn: fetchBudgetParameters,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (data && !values) {
      const toUpdate = (c: Currency) => ({
        electricity_price_kwh: data.parameters[c].electricity_price_kwh,
        error_margin_percent: data.parameters[c].error_margin_percent,
      });
      const initial: Record<Currency, BudgetParametersUpdate> = {
        ARS: toUpdate('ARS'),
        USD: toUpdate('USD'),
        EUR: toUpdate('EUR'),
        BRL: toUpdate('BRL'),
        GBP: toUpdate('GBP'),
        MXN: toUpdate('MXN'),
      };
      setValues(initial);
    }
  }, [data, values]);

  const setField = (field: keyof BudgetParametersUpdate, value: string) => {
    setValues((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [activeCurrency]: {
          ...prev[activeCurrency],
          [field]: value === '' ? 0 : Number(value),
        },
      };
    });
  };

  const validate = (v: BudgetParametersUpdate): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!(v.electricity_price_kwh > 0 && v.electricity_price_kwh <= 10000)) {
      errors.electricity_price_kwh = 'Debe ser mayor a 0 y hasta 10000.';
    }
    if (!(v.error_margin_percent >= 0 && v.error_margin_percent <= 100)) {
      errors.error_margin_percent = 'Debe estar entre 0 y 100.';
    }
    return errors;
  };

  const saveMutation = useMutation({
    mutationFn: () => updateBudgetParameters(activeCurrency, values![activeCurrency]),
    onSuccess: (saved) => {
      setValues((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [activeCurrency]: {
            electricity_price_kwh: saved.electricity_price_kwh,
            error_margin_percent: saved.error_margin_percent,
          },
        };
      });
      queryClient.setQueryData<BudgetParametersBundle>(['budget-parameters'], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          parameters: {
            ...prev.parameters,
            [activeCurrency]: { ...prev.parameters[activeCurrency], ...saved },
          },
        };
      });
      setFieldErrors({});
      setSnackbar({ message: 'Parámetros guardados.', severity: 'success' });
    },
    onError: (err: Error) => setSnackbar({ message: err.message, severity: 'error' }),
  });

  const defaultCurrencyMutation = useMutation({
    mutationFn: (c: Currency) => updateUserCurrency(c),
    onSuccess: (updated: User) => {
      setDefaultCurrency(updated.currency);
      setActiveCurrency(updated.currency);
      void refreshUser();
      setSnackbar({ message: 'Moneda por defecto actualizada.', severity: 'success' });
    },
    onError: (err: Error) => setSnackbar({ message: err.message, severity: 'error' }),
  });

  const handleSave = () => {
    if (!values) return;
    const errors = validate(values[activeCurrency]);
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      saveMutation.mutate();
    }
  };

  const isDefault = data?.parameters[activeCurrency].is_default ?? false;
  const active = values?.[activeCurrency];

  const fields: { key: keyof BudgetParametersUpdate; label: string }[] = [
    { key: 'electricity_price_kwh', label: 'Precio kWh' },
    { key: 'error_margin_percent', label: 'Margen de error %' },
  ];

  return (
    <div>
      <p className="mb-3 text-lg font-semibold">
        Parámetros del Maker
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Moneda por defecto</InputLabel>
            <Select<Currency>
              value={defaultCurrency}
              label="Moneda por defecto"
              onChange={(e) => {
                setDefaultTouched(true);
                setDefaultCurrency(e.target.value as Currency);
              }}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        <Button
          variant="outlined"
          onClick={() => defaultCurrencyMutation.mutate(defaultCurrency)}
          disabled={defaultCurrencyMutation.isPending || defaultCurrency === (user?.currency ?? 'ARS')}
          startIcon={defaultCurrencyMutation.isPending ? <CircularProgress size={16} /> : undefined}
          className="shrink-0"
        >
          Guardar
        </Button>
      </div>

      {isLoading || !active ? (
        <div className="flex justify-center py-4">
          <CircularProgress size={24} />
        </div>
      ) : (
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={activeCurrency}
            onChange={(_, next) => {
              if (next) {
                setActiveCurrency(next as Currency);
                setActiveTouched(true);
              }
            }}
            sx={{ mb: 2 }}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <ToggleButton key={c.value} value={c.value}>
                {c.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {activeCurrency === defaultCurrency && (
            <p className="mb-2 text-[0.8rem] text-slate">
              Mostrando los parámetros de tu moneda por defecto ({defaultCurrency}).
            </p>
          )}

          {isDefault && (
            <p className="mb-2 flex items-center gap-1 text-[0.8rem] text-slate">
              <StarIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              Estás usando los valores por defecto.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {fields.map(({ key, label }) => (
              <div key={key}>
                <TextField
                  label={label}
                  type="number"
                  size="small"
                  fullWidth
                  value={active[key]}
                  error={!!fieldErrors[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  slotProps={{ htmlInput: { step: 0.01 } }}
                />
                {fieldErrors[key] && <FieldError message={fieldErrors[key]} />}
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : undefined}
            >
              Guardar
            </Button>
          </div>
        </>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar?.severity ?? 'success'}
          onClose={() => setSnackbar(null)}
          sx={{ fontSize: '0.85rem' }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [businessName, setBusinessName] = useState(user?.business_name ?? '');
  const [hex, setHex] = useState(user?.primary_color ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [businessNameError, setBusinessNameError] = useState<string | null>(null);
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

  const businessNameMutation = useMutation({
    mutationFn: (newBusinessName: string | null) => updateProfile({ business_name: newBusinessName }),
    onSuccess: (updated: User) => {
      setBusinessName(updated.business_name ?? '');
      void refreshUser();
    },
    onError: (err: Error) => setBusinessNameError(err.message),
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

  const handleSaveBusinessName = () => {
    setBusinessNameError(null);
    const trimmed = businessName.trim();
    if (trimmed.length > 255) {
      setBusinessNameError('El nombre del negocio no puede superar los 255 caracteres.');
      return;
    }
    businessNameMutation.mutate(trimmed || null);
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
    <div className="mx-auto flex max-w-[1200px] flex-col gap-3">
      <h1 className="text-[1.6rem] font-bold leading-[1.15] tracking-[-0.01em]">
        Mi perfil
      </h1>

      <div className="card rounded-md border border-line bg-snow p-4">
        <p className="mb-3 text-[0.95rem] font-semibold">
          Información del Maker
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <TextField
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="small"
                fullWidth
                error={!!nameError}
                slotProps={{ inputLabel: { shrink: true } }}
                className="min-w-0"
              />
              <Button
                variant="contained"
                onClick={handleSaveName}
                disabled={nameMutation.isPending || name.trim() === (user?.name ?? '')}
                startIcon={nameMutation.isPending ? <CircularProgress size={16} /> : undefined}
                className="shrink-0"
              >
                Guardar
              </Button>
            </div>
            {nameError && <FieldError message={nameError} />}
            <p className="mt-1 text-[0.8rem] text-slate">
              Aparece en el saludo de la página de inicio.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <TextField
                label="Nombre del negocio"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                size="small"
                fullWidth
                error={!!businessNameError}
                slotProps={{ inputLabel: { shrink: true } }}
                className="min-w-0"
              />
              <Button
                variant="contained"
                onClick={handleSaveBusinessName}
                disabled={businessNameMutation.isPending || businessName.trim() === (user?.business_name ?? '')}
                startIcon={businessNameMutation.isPending ? <CircularProgress size={16} /> : undefined}
                className="shrink-0"
              >
                Guardar
              </Button>
            </div>
            {businessNameError && <FieldError message={businessNameError} />}
            <p className="mt-1 text-[0.8rem] text-slate">
              Se muestra en el nombre de la pestaña del navegador (ej: Mate Designs — Flayer).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <div className="card rounded-md border border-line bg-snow p-4">
            <p className="mb-2 text-[0.95rem] font-semibold">
              Color de acento
            </p>
        <div className="flex flex-wrap items-center gap-2">
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
              placeholder="#FF8400"
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
            className="shrink-0"
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
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="card rounded-md border border-line bg-snow p-4 h-full">
        <MakerParametersBlock />
      </div>
      </div>
    </div>
  );
}
