import { supabase } from './supabase';
import type { Profile } from './types';

interface LogActivityParams {
  actor: Profile;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      institution_id: params.actor.institution_id,
      actor_id: params.actor.id,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      meta: params.meta ?? null,
    });
  } catch (err) {
    // Log yazma hatasi ana islemi bozmamali — ancak gelistirici gormeli.
    if (__DEV__) {
      console.warn('[logActivity] aktivite logu yazilamadi:', err);
    }
  }
}
