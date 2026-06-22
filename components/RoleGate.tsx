import { type ReactNode } from 'react';
import type { Role } from '@/lib/types';
import { useAuth } from '@/lib/auth';

interface RoleGateProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { profile } = useAuth();

  if (!profile || !roles.includes(profile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
