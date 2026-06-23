import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Check,
  KeyRound,
  Building2,
  X,
  Mail,
  User,
  Copy,
  LogOut,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import type { Institution, InviteCode, Role } from '@/lib/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ROLES } from '@/constants/roles';
import { daysRemaining } from '@/lib/subscription';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function isCodeActive(code: InviteCode): boolean {
  if (code.used_count >= code.max_uses) return false;
  if (code.expires_at && new Date(code.expires_at) < new Date()) return false;
  return true;
}

export default function InstitutionsScreen() {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const {
    data: institutions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as Institution[];
    },
  });

  const { data: inviteCodes } = useQuery({
    queryKey: ['invite-codes-all'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      return (data as InviteCode[]) ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Oturum bulunamadı.');
      const { data, error: err } = await supabase
        .from('institutions')
        .insert({
          name: formName.trim(),
          contact_name: formContactName.trim() || null,
          contact_email: formContactEmail.trim() || null,
          subscription_status: 'expired',
          is_active: true,
          created_by: profile.id,
        })
        .select()
        .single();
      if (err) throw err;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      setFormName('');
      setFormContactName('');
      setFormContactEmail('');
      setFormError(null);
      setShowForm(false);
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Kurum oluşturulamadı.');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      if (!profile) throw new Error('Oturum bulunamadı.');
      const { error: err } = await supabase
        .from('institutions')
        .update({
          subscription_status: 'active',
          subscription_active_until: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', institutionId);
      if (err) throw err;
      await logActivity({
        actor: profile,
        action: 'Kurum aboneligi manuel aktif edildi (30 gun)',
        targetType: 'institution',
        targetId: institutionId,
        meta: { days: 30 },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: (err: Error) => {
      Alert.alert('Hata', err.message || 'Abonelik aktifleştirilemedi.');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (params: { institutionId: string; role: Role }) => {
      if (!profile) throw new Error('Oturum bulunamadı.');
      const { data, error: err } = await supabase
        .from('invite_codes')
        .insert({
          institution_id: params.institutionId,
          code: generateInviteCode(),
          role: params.role,
          max_uses: 1,
          used_count: 0,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          created_by: profile.id,
        })
        .select()
        .single();
      if (err) throw err;
      return data as InviteCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes-all'] });
      Alert.alert(
        'Davet Kodu Üretildi',
        `Kod: ${data.code}\nRol: ${ROLES[data.role]}\n\nBu kodu yeni kullanıcıyla paylaşın. Kod 7 gün geçerlidir.`
      );
    },
    onError: (err: Error) => {
      Alert.alert('Hata', err.message || 'Davet kodu üretilemedi.');
    },
  });

  async function handleCreate() {
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Kurum adı zorunludur.');
      return;
    }
    createMutation.mutate();
  }

  async function handleActivate(institutionId: string, name: string) {
    setActionLoadingId(institutionId);
    try {
      await activateMutation.mutateAsync(institutionId);
      Alert.alert(
        'Abonelik Aktif',
        `${name} kurumunun aboneliği 30 gün uzatıldı.`
      );
    } catch {
      // Error handled by mutation onError
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleGenerateCode(institutionId: string) {
    setActionLoadingId(`invite-${institutionId}`);
    try {
      await inviteMutation.mutateAsync({ institutionId, role: 'admin' });
    } catch {
      // Error handled by mutation onError
    } finally {
      setActionLoadingId(null);
    }
  }

  function resetForm() {
    setFormName('');
    setFormContactName('');
    setFormContactEmail('');
    setFormError(null);
    setShowForm(false);
  }

  async function handleSignOut() {
    await signOut();
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Kurumlar yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Kurumlar yüklenemedi."
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Kurumlar</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              <LogOut size={16} color="#dc2626" />
              <Text className="text-sm font-semibold text-red-600">Çıkış Yap</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowForm(!showForm)}
              className="flex-row items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2"
            >
              {showForm ? (
                <X size={18} color="#fff" />
              ) : (
                <Plus size={18} color="#fff" />
              )}
              <Text className="text-sm font-semibold text-white">
                {showForm ? 'İptal' : 'Yeni Kurum'}
              </Text>
            </Pressable>
          </View>
        </View>

        {showForm && (
          <Card className="gap-4">
            <Text className="text-lg font-semibold text-gray-700">
              Yeni Kurum Oluştur
            </Text>
            <Input
              label="Kurum Adı *"
              value={formName}
              onChangeText={setFormName}
              placeholder="Örn: ABC Hastanesi"
            />
            <Input
              label="İletişim Kişisi"
              value={formContactName}
              onChangeText={setFormContactName}
              placeholder="Ad Soyad"
              autoCapitalize="words"
            />
            <Input
              label="İletişim E-postası"
              value={formContactEmail}
              onChangeText={setFormContactEmail}
              placeholder="iletisim@kurum.com"
              keyboardType="email-address"
            />
            {formError && (
              <View className="rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{formError}</Text>
              </View>
            )}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="İptal"
                  variant="secondary"
                  onPress={resetForm}
                  disabled={createMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Oluştur"
                  loading={createMutation.isPending}
                  onPress={handleCreate}
                />
              </View>
            </View>
          </Card>
        )}

        {!institutions || institutions.length === 0 ? (
          <EmptyState
            icon={<Building2 size={48} color="#9ca3af" />}
            title="Henüz kurum yok"
            description="İlk kurumu oluşturmak için 'Yeni Kurum' düğmesine basın."
          />
        ) : (
          institutions.map((inst) => {
            const remaining = daysRemaining(inst);
            const codes = (inviteCodes ?? []).filter(
              (c) => c.institution_id === inst.id
            );
            const activeCodes = codes.filter(isCodeActive);

            return (
              <Card key={inst.id} className="gap-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">
                      {inst.name}
                    </Text>
                    {inst.contact_name && (
                      <View className="mt-1.5 flex-row items-center gap-1.5">
                        <User size={14} color="#9ca3af" />
                        <Text className="text-sm text-gray-500">
                          {inst.contact_name}
                        </Text>
                      </View>
                    )}
                    {inst.contact_email && (
                      <View className="mt-1 flex-row items-center gap-1.5">
                        <Mail size={14} color="#9ca3af" />
                        <Text className="text-sm text-gray-500">
                          {inst.contact_email}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    className={`rounded-lg px-2.5 py-1 ${remaining !== null && remaining > 0 ? 'bg-green-100' : 'bg-red-100'}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${remaining !== null && remaining > 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {remaining !== null && remaining > 0
                        ? `${remaining} gün`
                        : 'Pasif'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Aktif Et (30 gün)"
                      variant={remaining !== null && remaining > 0 ? 'secondary' : 'primary'}
                      loading={actionLoadingId === inst.id}
                      disabled={actionLoadingId === inst.id}
                      icon={<Check size={18} color={remaining !== null && remaining > 0 ? '#2563eb' : '#fff'} />}
                      onPress={() => handleActivate(inst.id, inst.name)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Davet Kodu"
                      variant="secondary"
                      loading={actionLoadingId === `invite-${inst.id}`}
                      disabled={actionLoadingId === `invite-${inst.id}`}
                      icon={<KeyRound size={18} color="#2563eb" />}
                      onPress={() => handleGenerateCode(inst.id)}
                    />
                  </View>
                </View>

                {activeCodes.length > 0 && (
                  <View className="gap-2 border-t border-gray-100 pt-3">
                    <Text className="text-xs font-medium text-gray-400">
                      Aktif Davet Kodları
                    </Text>
                    {activeCodes.map((code) => (
                      <Pressable
                        key={code.id}
                        onPress={() =>
                          Alert.alert(
                            'Davet Kodu',
                            `Kod: ${code.code}\nRol: ${ROLES[code.role]}\nGeçerlilik: ${code.expires_at ? new Date(code.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}`
                          )
                        }
                        className="flex-row items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <View className="flex-row items-center gap-2">
                          <KeyRound size={16} color="#2563eb" />
                          <Text className="font-mono text-sm font-semibold text-gray-700">
                            {code.code}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs text-gray-400">
                            {ROLES[code.role]}
                          </Text>
                          <Copy size={14} color="#9ca3af" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {codes.length > 0 && activeCodes.length === 0 && (
                  <Text className="text-xs text-gray-400">
                    Tüm davet kodları kullanılmış veya süresi dolmuş.
                  </Text>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
