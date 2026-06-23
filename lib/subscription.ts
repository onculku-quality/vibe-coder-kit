import type { Institution, Profile } from './types';

export function isSubscriptionActive(
  profile: Profile | null,
  institution: Institution | null
): boolean {
  if (!profile) return false;
  if (String(profile.role).trim() === 'platform_admini') return true;
  if (!institution) return false;
  if (!institution.subscription_active_until) return false;
  return new Date(institution.subscription_active_until) > new Date();
}

export function isSubscriptionLocked(
  profile: Profile | null,
  institution: Institution | null
): boolean {
  return !isSubscriptionActive(profile, institution);
}

export function daysRemaining(institution: Institution | null): number | null {
  if (!institution || !institution.subscription_active_until) return null;
  const diff = new Date(institution.subscription_active_until).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
