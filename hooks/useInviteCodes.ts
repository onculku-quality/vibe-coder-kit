import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import type { InviteCode, Profile, Role } from '@/lib/types';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function useInviteCodes(institutionId: string | null) {
  return useQuery({
    queryKey: ['invite-codes', institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('institution_id', institutionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as InviteCode[]) ?? [];
    },
  });
}

interface CreateInviteCodeInput {
  role: Role;
  maxUses?: number;
}

export function useCreateInviteCode(actor: Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInviteCodeInput) => {
      if (!actor.institution_id) {
        throw new Error('Kurum bilgisi bulunamadi.');
      }
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          institution_id: actor.institution_id,
          code: generateCode(),
          role: input.role,
          max_uses: input.maxUses ?? 1,
          used_count: 0,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: actor.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InviteCode;
    },
    onSuccess: (code) => {
      qc.invalidateQueries({ queryKey: ['invite-codes', actor.institution_id] });
      logActivity({
        actor,
        action: 'Davet kodu uretildi',
        targetType: 'invite_code',
        targetId: code.id,
        meta: { role: code.role, code: code.code },
      });
    },
  });
}
