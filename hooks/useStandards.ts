import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type { Standard, StandardQuestion, Profile } from '@/lib/types';

export function useStandards(institutionId: string | null) {
  return useQuery({
    queryKey: ['standards', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('standards')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Standard[]) ?? [];
    },
  });
}

export function useStandardQuestions(standardId: string | null) {
  return useQuery({
    queryKey: ['standard-questions', standardId],
    enabled: !!standardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('standard_questions')
        .select('*')
        .eq('standard_id', standardId!)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data as StandardQuestion[]) ?? [];
    },
  });
}

interface CreateStandardInput {
  name: string;
  description?: string;
}

export function useCreateStandard(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStandardInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (!input.name.trim()) {
        throw new Error('Standart adi zorunludur.');
      }
      const { data, error } = await supabase
        .from('standards')
        .insert({
          institution_id: actor.institution_id,
          name: input.name.trim(),
          description: input.description?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Standard;
    },
    onSuccess: (std) => {
      qc.invalidateQueries({ queryKey: ['standards', actor.institution_id] });
      logActivity({
        actor,
        action: 'Standart olusturuldu',
        targetType: 'standard',
        targetId: std.id,
        meta: { name: std.name },
      });
    },
  });
}

interface UpdateStandardInput {
  id: string;
  name: string;
  description?: string;
}

export function useUpdateStandard(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateStandardInput) => {
      if (!input.name.trim()) {
        throw new Error('Standart adi zorunludur.');
      }
      const { data, error } = await supabase
        .from('standards')
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Standard;
    },
    onSuccess: (std) => {
      qc.invalidateQueries({ queryKey: ['standards', actor.institution_id] });
      logActivity({
        actor,
        action: 'Standart guncellendi',
        targetType: 'standard',
        targetId: std.id,
        meta: { name: std.name },
      });
    },
  });
}

export function useDeleteStandard(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (standardId: string) => {
      const { error } = await supabase
        .from('standards')
        .delete()
        .eq('id', standardId);
      if (error) throw error;
    },
    onSuccess: (_data, standardId) => {
      qc.invalidateQueries({ queryKey: ['standards', actor.institution_id] });
      logActivity({
        actor,
        action: 'Standart silindi',
        targetType: 'standard',
        targetId: standardId,
      });
    },
  });
}

interface CreateQuestionInput {
  standardId: string;
  question: string;
  section?: string;
  guidance?: string;
  orderIndex?: number;
}

export function useCreateQuestion(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuestionInput) => {
      if (!input.question.trim()) {
        throw new Error('Soru metni zorunludur.');
      }
      const { data, error } = await supabase
        .from('standard_questions')
        .insert({
          standard_id: input.standardId,
          question: input.question.trim(),
          section: input.section?.trim() || null,
          guidance: input.guidance?.trim() || null,
          order_index: input.orderIndex ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as StandardQuestion;
    },
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['standard-questions', q.standard_id] });
      logActivity({
        actor,
        action: 'Standart sorusu eklendi',
        targetType: 'standard_question',
        targetId: q.id,
      });
    },
  });
}

interface UpdateQuestionInput {
  id: string;
  standardId: string;
  question: string;
  section?: string;
  guidance?: string;
  orderIndex?: number;
}

export function useUpdateQuestion(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateQuestionInput) => {
      if (!input.question.trim()) {
        throw new Error('Soru metni zorunludur.');
      }
      const { data, error } = await supabase
        .from('standard_questions')
        .update({
          question: input.question.trim(),
          section: input.section?.trim() || null,
          guidance: input.guidance?.trim() || null,
          order_index: input.orderIndex ?? 0,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as StandardQuestion;
    },
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['standard-questions', q.standard_id] });
      logActivity({
        actor,
        action: 'Standart sorusu guncellendi',
        targetType: 'standard_question',
        targetId: q.id,
      });
    },
  });
}

export function useDeleteQuestion(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; standardId: string }) => {
      const { error } = await supabase
        .from('standard_questions')
        .delete()
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['standard-questions', vars.standardId] });
      logActivity({
        actor,
        action: 'Standart sorusu silindi',
        targetType: 'standard_question',
        targetId: vars.id,
      });
    },
  });
}
