import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../lib/contracts';

export function RequireAuth({ role }: { role?: UserRole }) {
  const { isReady, user } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <Box sx={{ display: 'grid', minHeight: '50dvh', placeItems: 'center' }}><CircularProgress /></Box>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/my-courses" replace />;
  }

  return <Outlet />;
}
