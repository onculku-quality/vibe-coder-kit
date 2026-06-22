import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type { Profile } from '@/lib/types';

export function useProfiles(institutionId: string | null) {
  return useQuery({
    queryKey: ['profiles', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
  });
}

interface AssignTeamInput {
  targetProfileId: string;
  teamId: string | null;
}

export function useAssignTeam(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignTeamInput) => {
      const { error } = await supabase.rpc('assign_user_to_team', {
        target_profile_id: input.targetProfileId,
        team_id: input.teamId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['profiles', actor.institution_id] });
      logActivity({
        actor,
        action: input.teamId ? 'Kullanici takima atandi' : 'Kullanici takimdan cikarildi',
        targetType: 'profile',
        targetId: input.targetProfileId,
        meta: { team_id: input.teamId },
      });
    },
  });
}
