import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@/types';
import { clearAuth, getAuthUser, isLoggedIn, setAuthUser } from '@/api/auth/auth';
import { apiRequest } from '@/api/context/apiClient';

interface Props {
  allowedRoles: Role[];
  children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: Props) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [validUser, setValidUser] = useState(getAuthUser());

  useEffect(() => {
    async function verifySession() {
      if (!isLoggedIn()) {
        clearAuth();
        setValidUser(null);
        setChecking(false);
        return;
      }

      try {
        const response = await apiRequest<typeof validUser | { user: NonNullable<typeof validUser> }>('/auth/me');
        const user = response && 'user' in response ? response.user : response;

        if (!user) {
          clearAuth();
          setValidUser(null);
          return;
        }

        setAuthUser(user);
        setValidUser(user);
      } catch {
        clearAuth();
        setValidUser(null);
      } finally {
        setChecking(false);
      }
    }

    verifySession();
  }, []);

  if (checking) {
    return <div className="auth-loading">Checking session...</div>;
  }

  if (!validUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(validUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}