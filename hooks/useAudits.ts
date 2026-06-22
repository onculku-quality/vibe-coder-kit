import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { pickAndUploadEvidence } from '@/lib/storage';
import type {
  AnswerValue,
  Audit,
  AuditAnswerWithQuestion,
  AuditStatus,
  Profile,
} from '@/lib/types';

export function useAudits(institutionId: string | null) {
  return useQuery({
    queryKey: ['audits', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Audit[]) ?? [];
    },
  });
}

export function useAudit(auditId: string | null) {
  return useQuery({
    queryKey: ['audit', auditId],
    enabled: !!auditId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Audit | null) ?? null;
    },
  });
}

export function useAuditAnswers(auditId: string | null, standardId: string | null) {
  return useQuery({
    queryKey: ['audit-answers', auditId, standardId],
    enabled: !!auditId,
    queryFn: async () => {
      const { data: answers, error: aErr } = await supabase
        .from('audit_answers')
        .select('*')
        .eq('audit_id', auditId!);
      if (aErr) throw aErr;

      if (!standardId) {
        return (answers as AuditAnswerWithQuestion[] ?? []).map((a) => ({
          ...a,
          question: '(Soru bulunamadı)',
          section: null,
          guidance: null,
          order_index: 0,
        }));
      }

      const { data: questions, error: qErr } = await supabase
        .from('standard_questions')
        .select('id, question, section, guidance, order_index, standard_id')
        .eq('standard_id', standardId);
      if (qErr) throw qErr;

      const qMap = new Map(
        (questions ?? []).map((q) => [
          q.id,
          {
            question: q.question,
            section: q.section,
            guidance: q.guidance,
            order_index: q.order_index,
          },
        ])
      );

      const merged: AuditAnswerWithQuestion[] = (answers as AuditAnswerWithQuestion[] ?? []).map(
        (a) => {
          const q = qMap.get(a.question_id);
          return {
            ...a,
            question: q?.question ?? '(Soru bulunamadı)',
            section: q?.section ?? null,
            guidance: q?.guidance ?? null,
            order_index: q?.order_index ?? 0,
          };
        }
      );

      return merged.sort((x, y) => x.order_index - y.order_index);
    },
  });
}

interface CreateAuditInput {
  planId: string;
  institutionId: string;
  standardId: string | null;
  assignedTo: string;
}

export function useCreateAudit(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAuditInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (input.institutionId !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun planina denetci atayabilirsiniz.');
      }
      if (!input.assignedTo) {
        throw new Error('Atanacak denetci secilmeli.');
      }
      const { data, error } = await supabase
        .from('audits')
        .insert({
          institution_id: input.institutionId,
          plan_id: input.planId,
          standard_id: input.standardId,
          assigned_to: input.assignedTo,
          assigned_by: actor.id,
          status: 'atandi',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Audit;
    },
    onSuccess: (audit) => {
      qc.invalidateQueries({ queryKey: ['audits', actor.institution_id] });
      logActivity({
        actor,
        action: 'Denetci atandi',
        targetType: 'audit',
        targetId: audit.id,
        meta: { plan_id: audit.plan_id, assigned_to: audit.assigned_to },
      });
    },
  });
}

export function useUpdateAuditStatus(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { auditId: string; status: AuditStatus }) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      const { data, error } = await supabase
        .from('audits')
        .update({ status: vars.status })
        .eq('id', vars.auditId)
        .select()
        .single();
      if (error) throw error;
      const updated = data as Audit;
      if (updated.institution_id !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun denetimini guncelleyebilirsiniz.');
      }
      return updated;
    },
    onSuccess: (audit) => {
      qc.invalidateQueries({ queryKey: ['audits', actor.institution_id] });
      qc.invalidateQueries({ queryKey: ['audit', audit.id] });
      logActivity({
        actor,
        action: 'Denetim durumu guncellendi',
        targetType: 'audit',
        targetId: audit.id,
        meta: { status: audit.status },
      });
    },
  });
}

interface UpdateAnswerInput {
  answerId: string;
  auditId: string;
  institutionId: string;
  answer: AnswerValue | null;
  responsible?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

export function useUpdateAnswer(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAnswerInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (input.institutionId !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun denetimini guncellenebilir.');
      }
      const { data, error } = await supabase
        .from('audit_answers')
        .update({
          answer: input.answer,
          responsible: input.responsible?.trim() || null,
          due_date: input.dueDate || null,
          notes: input.notes?.trim() || null,
        })
        .eq('id', input.answerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['audit-answers', input.auditId] });
      qc.invalidateQueries({ queryKey: ['audit-answer-stats', actor.institution_id] });
      logActivity({
        actor,
        action: 'Denetim cevabi kaydedildi',
        targetType: 'audit_answer',
        targetId: input.answerId,
        meta: { answer: input.answer },
      });
    },
  });
}

interface AddEvidenceInput {
  answerId: string;
  auditId: string;
  institutionId: string;
}

export function useAddEvidence(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddEvidenceInput): Promise<string> => {
      const { path, error } = await pickAndUploadEvidence(
        input.institutionId,
        input.auditId,
        input.answerId
      );
      if (error) throw new Error(error);
      if (!path) throw new Error('Fotoğraf seçilmedi.');

      const { error: rpcErr } = await supabase.rpc('add_evidence_to_answer', {
        p_answer_id: input.answerId,
        p_path: path,
      });
      if (rpcErr) throw rpcErr;

      return path;
    },
    onSuccess: (_path, input) => {
      qc.invalidateQueries({ queryKey: ['audit-answers', input.auditId] });
      logActivity({
        actor,
        action: 'Kanit fotograf eklendi',
        targetType: 'audit_answer',
        targetId: input.answerId,
        meta: { audit_id: input.auditId },
      });
    },
  });
}

interface RemoveEvidenceInput {
  answerId: string;
  auditId: string;
  path: string;
}

export function useRemoveEvidence(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RemoveEvidenceInput) => {
      const { error: rpcErr } = await supabase.rpc('remove_evidence_from_answer', {
        p_answer_id: input.answerId,
        p_path: input.path,
      });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['audit-answers', input.auditId] });
      logActivity({
        actor,
        action: 'Kanit fotograf silindi',
        targetType: 'audit_answer',
        targetId: input.answerId,
        meta: { audit_id: input.auditId, path: input.path },
      });
    },
  });
}

export function useDeleteAudit(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { auditId: string }) => {
      const { error } = await supabase.from('audits').delete().eq('id', vars.auditId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['audits', actor.institution_id] });
      qc.invalidateQueries({ queryKey: ['audit', vars.auditId] });
      qc.invalidateQueries({ queryKey: ['audit-answer-stats', actor.institution_id] });
      logActivity({
        actor,
        action: 'Denetim silindi',
        targetType: 'audit',
        targetId: vars.auditId,
      });
    },
  });
}
