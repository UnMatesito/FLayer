'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { buildTheme } from './theme';
import { AuthProvider, useAuth } from './auth-context';

function ThemedApp({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const theme = useMemo(
    () => buildTheme(user?.primary_color ?? null),
    [user?.primary_color]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemedApp>{children}</ThemedApp>
      </AuthProvider>
    </QueryClientProvider>
  );
}
