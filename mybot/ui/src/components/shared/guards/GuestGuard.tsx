import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { dashboardPathForRole, getAuthUser, isLoggedIn } from '@/api/auth/auth';

interface Props {
  children: ReactNode;
}

export default function GuestGuard({ children }: Props) {
  const user = getAuthUser();

  if (isLoggedIn() && user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}