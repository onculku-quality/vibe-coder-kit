import type { Role } from '@/lib/types';

export const ROLES: Record<Role, string> = {
  platform_admini: 'Platform Yöneticisi',
  admin: 'Kurum Yöneticisi',
  bas_denetci: 'Baş Denetçi',
  denetci: 'Denetçi',
};

export const ROLE_ORDER: Role[] = ['platform_admini', 'admin', 'bas_denetci', 'denetci'];

export const INVITE_ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Kurum Yöneticisi' },
  { value: 'bas_denetci', label: 'Baş Denetçi' },
  { value: 'denetci', label: 'Denetçi' },
];
