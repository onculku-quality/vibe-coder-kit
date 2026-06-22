import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type {
  Meeting,
  MeetingAgendaItem,
  MeetingDecision,
  MeetingType,
  Profile,
} from '@/lib/types';

export function useMeetingsByPlan(planId: string | null) {
  return useQuery({
    queryKey: ['meetings', 'plan', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('plan_id', planId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as Meeting[]) ?? [];
    },
  });
}

interface CreateMeetingInput {
  planId: string;
  institutionId: string;
  type: MeetingType;
  meetingDate?: string | null;
  location?: string;
  participants?: string[];
  agenda?: MeetingAgendaItem[];
  decisions?: MeetingDecision[];
  notes?: string;
}

export function useCreateMeeting(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (input.institutionId !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun planina toplantu ekleyebilirsiniz.');
      }
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          plan_id: input.planId,
          institution_id: input.institutionId,
          type: input.type,
          meeting_date: input.meetingDate ?? null,
          location: input.location?.trim() || null,
          participants: input.participants ?? [],
          agenda: input.agenda ?? [],
          decisions: input.decisions ?? [],
          notes: input.notes?.trim() || null,
          created_by: actor.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: (meeting) => {
      qc.invalidateQueries({ queryKey: ['meetings', 'plan', meeting.plan_id] });
      logActivity({
        actor,
        action: 'Toplanti olusturuldu',
        targetType: 'meeting',
        targetId: meeting.id,
        meta: { type: meeting.type, plan_id: meeting.plan_id },
      });
    },
  });
}

interface UpdateMeetingInput {
  id: string;
  institutionId: string;
  planId: string;
  type: MeetingType;
  meetingDate?: string | null;
  location?: string;
  participants?: string[];
  agenda?: MeetingAgendaItem[];
  decisions?: MeetingDecision[];
  notes?: string;
}

export function useUpdateMeeting(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMeetingInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      if (input.institutionId !== actor.institution_id) {
        throw new Error('Yalnizca kendi kurumunuzun toplantisini guncelleyebilirsiniz.');
      }
      const { data, error } = await supabase
        .from('meetings')
        .update({
          type: input.type,
          meeting_date: input.meetingDate ?? null,
          location: input.location?.trim() || null,
          participants: input.participants ?? [],
          agenda: input.agenda ?? [],
          decisions: input.decisions ?? [],
          notes: input.notes?.trim() || null,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: (meeting) => {
      qc.invalidateQueries({ queryKey: ['meetings', 'plan', meeting.plan_id] });
      logActivity({
        actor,
        action: 'Toplanti guncellendi',
        targetType: 'meeting',
        targetId: meeting.id,
        meta: { type: meeting.type, plan_id: meeting.plan_id },
      });
    },
  });
}

export function useDeleteMeeting(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; planId: string; type: MeetingType }) => {
      const { error } = await supabase.from('meetings').delete().eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['meetings', 'plan', vars.planId] });
      logActivity({
        actor,
        action: 'Toplanti silindi',
        targetType: 'meeting',
        targetId: vars.id,
        meta: { type: vars.type, plan_id: vars.planId },
      });
    },
  });
}

export function useMeeting(planId: string | null, type: MeetingType) {
  return useQuery({
    queryKey: ['meeting', planId, type],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('plan_id', planId!)
        .eq('type', type)
        .maybeSingle();
      if (error) throw error;
      return (data as Meeting | null) ?? null;
    },
  });
}
