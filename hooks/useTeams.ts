import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type { Team, Profile } from '@/lib/types';

export function useTeams(institutionId: string | null) {
  return useQuery({
    queryKey: ['teams', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Team[]) ?? [];
    },
  });
}

interface CreateTeamInput {
  name: string;
  location?: string;
  leaderId?: string | null;
}

export function useCreateTeam(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (!input.name.trim()) {
        throw new Error('Takim adi zorunludur.');
      }
      const { data, error } = await supabase
        .from('teams')
        .insert({
          institution_id: actor.institution_id,
          name: input.name.trim(),
          location: input.location?.trim() || null,
          leader_id: input.leaderId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['teams', actor.institution_id] });
      logActivity({
        actor,
        action: 'Takim olusturuldu',
        targetType: 'team',
        targetId: team.id,
        meta: { name: team.name },
      });
    },
  });
}

interface UpdateTeamInput {
  id: string;
  name: string;
  location?: string;
  leaderId?: string | null;
}

export function useUpdateTeam(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTeamInput) => {
      if (!input.name.trim()) {
        throw new Error('Takim adi zorunludur.');
      }
      const { data, error } = await supabase
        .from('teams')
        .update({
          name: input.name.trim(),
          location: input.location?.trim() || null,
          leader_id: input.leaderId ?? null,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['teams', actor.institution_id] });
      logActivity({
        actor,
        action: 'Takim guncellendi',
        targetType: 'team',
        targetId: team.id,
        meta: { name: team.name },
      });
    },
  });
}

export function useDeleteTeam(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', actor.institution_id] });
      logActivity({ actor, action: 'Takim silindi' });
    },
  });
}
