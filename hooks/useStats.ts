import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AnswerValue } from '@/lib/types';

export interface AuditAnswerStats {
  total: number;
  answered: number;
  byValue: Record<AnswerValue, number>;
  complianceRate: number | null;
}

export function useAuditAnswerStats(institutionId: string | null) {
  return useQuery({
    queryKey: ['audit-answer-stats', institutionId],
    enabled: !!institutionId,
    queryFn: async (): Promise<AuditAnswerStats> => {
      const { data, error } = await supabase
        .from('audit_answers')
        .select('answer')
        .eq('institution_id', institutionId!);
      if (error) throw error;

      const rows = (data ?? []) as { answer: AnswerValue | null }[];
      const byValue: Record<AnswerValue, number> = {
        uygun: 0,
        uygun_degil: 0,
        kismen: 0,
        uygulanamaz: 0,
      };
      let answered = 0;
      for (const r of rows) {
        if (r.answer) {
          byValue[r.answer] = (byValue[r.answer] ?? 0) + 1;
          answered += 1;
        }
      }

      const relevant = byValue.uygun + byValue.uygun_degil + byValue.kismen;
      const complianceRate =
        relevant > 0 ? Math.round((byValue.uygun / relevant) * 100) : null;

      return {
        total: rows.length,
        answered,
        byValue,
        complianceRate,
      };
    },
  });
}
