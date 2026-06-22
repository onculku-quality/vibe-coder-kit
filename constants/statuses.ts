import type { AnswerValue, AuditStatus, DifStatus, MeetingType, PlanStatus, SubscriptionStatus } from '@/lib/types';

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, string> = {
  active: 'Aktif',
  expired: 'Süresi Doldu',
  cancelled: 'İptal Edildi',
};

export function institutionActiveLabel(isActive: boolean): string {
  return isActive ? 'Aktif' : 'Pasif';
}

export const PLAN_STATUS: Record<PlanStatus, string> = {
  planlandi: 'Planlandı',
  devam_ediyor: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

export const PLAN_STATUS_ORDER: PlanStatus[] = [
  'planlandi',
  'devam_ediyor',
  'tamamlandi',
  'iptal',
];

export const MEETING_TYPE: Record<MeetingType, string> = {
  acilis: 'Açılış Toplantısı',
  kapanis: 'Kapanış Toplantısı',
};

export const MEETING_TYPE_ORDER: MeetingType[] = ['acilis', 'kapanis'];

export const AUDIT_STATUS: Record<AuditStatus, string> = {
  atandi: 'Atandı',
  devam_ediyor: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
};

export const AUDIT_STATUS_ORDER: AuditStatus[] = ['atandi', 'devam_ediyor', 'tamamlandi'];

export const ANSWER_VALUE: Record<AnswerValue, string> = {
  uygun: 'Uygun',
  uygun_degil: 'Uygun Değil',
  kismen: 'Kısmen',
  uygulanamaz: 'Uygulanamaz',
};

export const ANSWER_VALUE_ORDER: AnswerValue[] = [
  'uygun',
  'uygun_degil',
  'kismen',
  'uygulanamaz',
];

export const ANSWER_VALUE_COLOR: Record<AnswerValue, string> = {
  uygun: '#16a34a',
  uygun_degil: '#dc2626',
  kismen: '#f59e0b',
  uygulanamaz: '#6b7280',
};

export const DIF_STATUS: Record<DifStatus, string> = {
  acik: 'Açık',
  inceleniyor: 'İnceleniyor',
  onaylanmis: 'Onaylanmış',
  kapali: 'Kapalı',
};

export const DIF_STATUS_ORDER: DifStatus[] = [
  'acik',
  'inceleniyor',
  'onaylanmis',
  'kapali',
];

export const DIF_STATUS_COLOR: Record<DifStatus, string> = {
  acik: '#dc2626',
  inceleniyor: '#f59e0b',
  onaylanmis: '#2563eb',
  kapali: '#16a34a',
};
