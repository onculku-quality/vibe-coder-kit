import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ActivityLog } from '@/lib/types';

export interface ActivityLogWithActor extends ActivityLog {
  actor_name: string | null;
}

export function useActivityLogs(institutionId: string | null) {
  return useQuery({
    queryKey: ['activity-logs', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles!actor_id(name)')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as (ActivityLog & { actor: { name: string } | null })[]).map(
        (row) => ({
          ...row,
          actor_name: row.actor?.name ?? null,
        })
      ) as ActivityLogWithActor[];
    },
  });
}
