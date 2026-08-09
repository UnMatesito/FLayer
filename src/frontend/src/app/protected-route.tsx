'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { CircularProgress } from '@mui/material';
import { useAuth } from './auth-context';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <CircularProgress />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
