import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type { Plan, Profile, PlanStatus, AgendaItem } from '@/lib/types';

export function usePlans(institutionId: string | null) {
  return useQuery({
    queryKey: ['plans', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Plan[]) ?? [];
    },
  });
}

export function usePlan(planId: string | null) {
  return useQuery({
    queryKey: ['plan', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Plan | null) ?? null;
    },
  });
}

interface CreatePlanInput {
  name: string;
  standardId?: string | null;
  auditDate?: string | null;
  teamId?: string | null;
  departments?: string[];
  hourlyAgenda?: AgendaItem[];
  status?: PlanStatus;
}

export function useCreatePlan(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (!input.name.trim()) {
        throw new Error('Plan adi zorunludur.');
      }
      const { data, error } = await supabase
        .from('plans')
        .insert({
          institution_id: actor.institution_id,
          name: input.name.trim(),
          standard_id: input.standardId ?? null,
          audit_date: input.auditDate ?? null,
          team_id: input.teamId ?? null,
          departments: input.departments ?? [],
          hourly_agenda: input.hourlyAgenda ?? [],
          status: input.status ?? 'planlandi',
          created_by: actor.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Plan;
    },
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ['plans', actor.institution_id] });
      logActivity({
        actor,
        action: 'Denetim plani olusturuldu',
        targetType: 'plan',
        targetId: plan.id,
        meta: { name: plan.name },
      });
    },
  });
}

interface UpdatePlanInput {
  id: string;
  name: string;
  standardId?: string | null;
  auditDate?: string | null;
  teamId?: string | null;
  departments: string[];
  hourlyAgenda: AgendaItem[];
  status: PlanStatus;
}

export function useUpdatePlan(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePlanInput) => {
      if (!input.name.trim()) {
        throw new Error('Plan adi zorunludur.');
      }
      const { data, error } = await supabase
        .from('plans')
        .update({
          name: input.name.trim(),
          standard_id: input.standardId ?? null,
          audit_date: input.auditDate ?? null,
          team_id: input.teamId ?? null,
          departments: input.departments,
          hourly_agenda: input.hourlyAgenda,
          status: input.status,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Plan;
    },
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ['plans', actor.institution_id] });
      qc.invalidateQueries({ queryKey: ['plan', plan.id] });
      logActivity({
        actor,
        action: 'Denetim plani guncellendi',
        targetType: 'plan',
        targetId: plan.id,
        meta: { name: plan.name },
      });
    },
  });
}

export function useDeletePlan(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('plans').delete().eq('id', planId);
      if (error) throw error;
    },
    onSuccess: (_data, planId) => {
      qc.invalidateQueries({ queryKey: ['plans', actor.institution_id] });
      logActivity({
        actor,
        action: 'Denetim plani silindi',
        targetType: 'plan',
        targetId: planId,
      });
    },
  });
}
