'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

type DashboardFeedbackSeverity = 'success' | 'error' | 'warning' | 'info';

interface DashboardFeedbackEntry {
  id: number;
  message: string;
  severity: DashboardFeedbackSeverity;
}

interface DashboardFeedbackContextValue {
  notify: (message: string, severity?: DashboardFeedbackSeverity) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const DashboardFeedbackContext = createContext<DashboardFeedbackContextValue | null>(null);

export function DashboardFeedbackProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<DashboardFeedbackEntry | null>(null);
  const nextId = useRef(1);

  const notify = (message: string, severity: DashboardFeedbackSeverity = 'info') => {
    setEntry({ id: nextId.current++, message, severity });
  };

  return (
    <DashboardFeedbackContext.Provider value={{ notify, success: (message) => notify(message, 'success'), error: (message) => notify(message, 'error') }}>
      {children}
      <Snackbar
        key={entry?.id}
        open={!!entry}
        autoHideDuration={entry?.severity === 'warning' ? 8000 : 3500}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setEntry(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={entry?.severity ?? 'info'} onClose={() => setEntry(null)} sx={{ fontSize: '0.85rem' }}>
          {entry?.message}
        </Alert>
      </Snackbar>
    </DashboardFeedbackContext.Provider>
  );
}

export function useDashboardFeedback(): DashboardFeedbackContextValue {
  const ctx = useContext(DashboardFeedbackContext);
  if (!ctx) throw new Error('useDashboardFeedback must be used within DashboardFeedbackProvider');
  return ctx;
}
