export type Role = 'platform_admini' | 'admin' | 'bas_denetci' | 'denetci';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Institution {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  subscription_status: SubscriptionStatus;
  subscription_active_until: string | null;
  play_purchase_token: string | null;
  play_subscription_id: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Profile {
  id: string;
  institution_id: string | null;
  name: string;
  role: Role;
  team_id: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  institution_id: string;
  name: string;
  location: string | null;
  leader_id: string | null;
  created_at: string;
}

export interface InviteCode {
  id: string;
  institution_id: string;
  code: string;
  role: Role;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  institution_id: string | null;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export type PlanStatus = 'planlandi' | 'devam_ediyor' | 'tamamlandi' | 'iptal';

export interface Standard {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface StandardQuestion {
  id: string;
  standard_id: string;
  order_index: number;
  section: string | null;
  question: string;
  guidance: string | null;
  created_at: string;
}

export interface AgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface Plan {
  id: string;
  institution_id: string;
  standard_id: string | null;
  name: string;
  audit_date: string | null;
  team_id: string | null;
  departments: string[];
  hourly_agenda: AgendaItem[];
  status: PlanStatus;
  created_by: string | null;
  created_at: string;
}

export type MeetingType = 'acilis' | 'kapanis';

export interface MeetingAgendaItem {
  title: string;
  description?: string;
}

export interface MeetingDecision {
  text: string;
  responsible?: string;
}

export interface Meeting {
  id: string;
  plan_id: string;
  institution_id: string;
  type: MeetingType;
  meeting_date: string | null;
  location: string | null;
  participants: string[];
  agenda: MeetingAgendaItem[];
  decisions: MeetingDecision[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type AuditStatus = 'atandi' | 'devam_ediyor' | 'tamamlandi';

export type AnswerValue = 'uygun' | 'uygun_degil' | 'kismen' | 'uygulanamaz';

export interface Audit {
  id: string;
  institution_id: string;
  plan_id: string;
  standard_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  status: AuditStatus;
  created_at: string;
}

export interface AuditAnswer {
  id: string;
  audit_id: string;
  institution_id: string;
  question_id: string;
  answer: AnswerValue | null;
  responsible: string | null;
  due_date: string | null;
  notes: string | null;
  evidence_paths: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditAnswerWithQuestion extends AuditAnswer {
  question: string;
  section: string | null;
  guidance: string | null;
  order_index: number;
}

export type DifStatus = 'acik' | 'inceleniyor' | 'onaylanmis' | 'kapali';

export interface Dif {
  id: string;
  institution_id: string;
  audit_id: string;
  audit_answer_id: string | null;
  title: string;
  source: string | null;
  root_cause: string | null;
  action: string | null;
  responsible: string | null;
  due_date: string | null;
  status: DifStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DifStatusHistory {
  id: string;
  dif_id: string;
  from_status: DifStatus | null;
  to_status: DifStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}
