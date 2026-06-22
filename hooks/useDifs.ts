import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type { Dif, DifStatus, DifStatusHistory, Profile } from '@/lib/types';

export function useDifs(institutionId: string | null) {
  return useQuery({
    queryKey: ['difs', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('difs')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Dif[]) ?? [];
    },
  });
}

export function useDif(difId: string | null) {
  return useQuery({
    queryKey: ['dif', difId],
    enabled: !!difId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('difs')
        .select('*')
        .eq('id', difId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Dif | null) ?? null;
    },
  });
}

export function useDifStatusHistory(difId: string | null) {
  return useQuery({
    queryKey: ['dif-status-history', difId],
    enabled: !!difId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dif_status_history')
        .select('*')
        .eq('dif_id', difId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as DifStatusHistory[]) ?? [];
    },
  });
}

interface CreateDifInput {
  institutionId: string;
  auditId: string;
  auditAnswerId?: string | null;
  title: string;
  source?: string;
  rootCause?: string;
  action?: string;
  responsible?: string;
  dueDate?: string;
}

export function useCreateDif(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDifInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (input.institutionId !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun denetimine DIF acabilirsiniz.');
      }
      if (!input.title.trim()) {
        throw new Error('DIF basligi zorunludur.');
      }
      const { data, error } = await supabase
        .from('difs')
        .insert({
          institution_id: input.institutionId,
          audit_id: input.auditId,
          audit_answer_id: input.auditAnswerId ?? null,
          title: input.title.trim(),
          source: input.source?.trim() || null,
          root_cause: input.rootCause?.trim() || null,
          action: input.action?.trim() || null,
          responsible: input.responsible?.trim() || null,
          due_date: input.dueDate || null,
          status: 'acik',
          created_by: actor.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Dif;
    },
    onSuccess: (dif) => {
      qc.invalidateQueries({ queryKey: ['difs', actor.institution_id] });
      logActivity({
        actor,
        action: 'DIF acildi',
        targetType: 'dif',
        targetId: dif.id,
        meta: { title: dif.title, audit_id: dif.audit_id },
      });
    },
  });
}

interface UpdateDifInput {
  id: string;
  title: string;
  source?: string;
  rootCause?: string;
  action?: string;
  responsible?: string;
  dueDate?: string;
}

export function useUpdateDif(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateDifInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (!input.title.trim()) {
        throw new Error('DIF basligi zorunludur.');
      }
      const { data, error } = await supabase
        .from('difs')
        .update({
          title: input.title.trim(),
          source: input.source?.trim() || null,
          root_cause: input.rootCause?.trim() || null,
          action: input.action?.trim() || null,
          responsible: input.responsible?.trim() || null,
          due_date: input.dueDate || null,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as Dif;
      if (updated.institution_id !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun DIF\'ini guncelleyebilirsiniz.');
      }
      return updated;
    },
    onSuccess: (dif) => {
      qc.invalidateQueries({ queryKey: ['difs', actor.institution_id] });
      qc.invalidateQueries({ queryKey: ['dif', dif.id] });
      logActivity({
        actor,
        action: 'DIF guncellendi',
        targetType: 'dif',
        targetId: dif.id,
        meta: { title: dif.title },
      });
    },
  });
}

export function useChangeDifStatus(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { difId: string; status: DifStatus }) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      const { data, error } = await supabase
        .from('difs')
        .update({ status: vars.status })
        .eq('id', vars.difId)
        .select()
        .single();
      if (error) throw error;
      const updated = data as Dif;
      if (updated.institution_id !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun DIF\'inin durumunu degistirebilirsiniz.');
      }
      return updated;
    },
    onSuccess: (dif) => {
      qc.invalidateQueries({ queryKey: ['difs', actor.institution_id] });
      qc.invalidateQueries({ queryKey: ['dif', dif.id] });
      qc.invalidateQueries({ queryKey: ['dif-status-history', dif.id] });
      logActivity({
        actor,
        action: 'DIF durumu degisti',
        targetType: 'dif',
        targetId: dif.id,
        meta: { status: dif.status },
      });
    },
  });
}

export function useDeleteDif(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { difId: string }) => {
      const { error } = await supabase.from('difs').delete().eq('id', vars.difId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['difs', actor.institution_id] });
      qc.invalidateQueries({ queryKey: ['dif', vars.difId] });
      logActivity({
        actor,
        action: 'DIF silindi',
        targetType: 'dif',
        targetId: vars.difId,
      });
    },
  });
}
