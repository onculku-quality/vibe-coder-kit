import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyRound,
  Copy,
  UserCog,
  Users as UsersIcon,
  Plus,
  Check,
  X,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useProfiles, useAssignTeam } from '@/hooks/useProfiles';
import { useTeams } from '@/hooks/useTeams';
import { useInviteCodes, useCreateInviteCode } from '@/hooks/useInviteCodes';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ROLES, INVITE_ROLES } from '@/constants/roles';
import type { InviteCode, Profile, Role } from '@/lib/types';

function isCodeActive(code: InviteCode): boolean {
  if (code.used_count >= code.max_uses) return false;
  if (code.expires_at && new Date(code.expires_at) < new Date()) return false;
  return true;
}

export default function UsersScreen() {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id ?? null;

  const profilesQuery = useProfiles(institutionId);
  const teamsQuery = useTeams(institutionId);
  const inviteCodesQuery = useInviteCodes(institutionId);
  const createInviteCode = useCreateInviteCode(profile as Profile);
  const assignTeam = useAssignTeam(profile as Profile);

  const [selectedRole, setSelectedRole] = useState<Role>('denetci');
  const [maxUses, setMaxUses] = useState('1');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [assignLoadingId, setAssignLoadingId] = useState<string | null>(null);

  const profiles = profilesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const codes = inviteCodesQuery.data ?? [];
  const activeCodes = codes.filter(isCodeActive);

  function teamName(id: string | null): string | null {
    if (!id) return null;
    const found = teams.find((t) => t.id === id);
    return found ? found.name : null;
  }

  async function handleGenerateCode() {
    setCodeError(null);
    const uses = parseInt(maxUses, 10);
    if (Number.isNaN(uses) || uses < 1) {
      setCodeError('Kullanım sayısı en az 1 olmalıdır.');
      return;
    }
    try {
      const code = await createInviteCode.mutateAsync({
        role: selectedRole,
        maxUses: uses,
      });
      Alert.alert(
        'Davet Kodu Üretildi',
        `Kod: ${code.code}\nRol: ${ROLES[code.role]}\n\nBu kodu yeni kullanıcıyla paylaşın. Kod 7 gün geçerlidir.`
      );
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Davet kodu üretilemedi.');
    }
  }

  async function handleAssign(targetProfileId: string, teamId: string | null) {
    setAssignLoadingId(targetProfileId);
    try {
      await assignTeam.mutateAsync({ targetProfileId, teamId });
      setExpandedUserId(null);
    } catch (err) {
      Alert.alert(
        'Hata',
        err instanceof Error ? err.message : 'Kullanıcı takıma atanamadı.'
      );
    } finally {
      setAssignLoadingId(null);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-medium text-gray-600">
            Bu sayfaya erişim yetkiniz yok.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profilesQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Kullanıcı bilgileri yüklenemedi."
          onRetry={() => profilesQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <Text className="text-2xl font-bold text-gray-800">Kullanıcılar</Text>

        <Card className="gap-4">
          <View className="flex-row items-center gap-2">
            <KeyRound size={20} color="#2563eb" />
            <Text className="text-lg font-semibold text-gray-700">Davet Kodu Üret</Text>
          </View>
          <View className="gap-2">
            <Text className="text-sm font-medium text-gray-700">Rol</Text>
            <View className="flex-row flex-wrap gap-2">
              {INVITE_ROLES.map((r) => {
                const selected = selectedRole === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setSelectedRole(r.value)}
                    className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
                  >
                    {selected ? <Check size={14} color="#fff" /> : null}
                    <Text
                      className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Input
            label="Kullanım Sayısı"
            value={maxUses}
            onChangeText={setMaxUses}
            placeholder="1"
            keyboardType="numeric"
          />
          {codeError && (
            <View className="rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{codeError}</Text>
            </View>
          )}
          <Button
            label="Davet Kodu Üret"
            loading={createInviteCode.isPending}
            disabled={createInviteCode.isPending}
            icon={<Plus size={18} color="#fff" />}
            onPress={handleGenerateCode}
          />
        </Card>

        {activeCodes.length > 0 && (
          <Card className="gap-3">
            <Text className="text-sm font-medium text-gray-500">Aktif Davet Kodları</Text>
            {activeCodes.map((code) => (
              <Pressable
                key={code.id}
                onPress={() =>
                  Alert.alert(
                    'Davet Kodu',
                    `Kod: ${code.code}\nRol: ${ROLES[code.role]}\nKullanım: ${code.used_count}/${code.max_uses}\nGeçerlilik: ${code.expires_at ? new Date(code.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}`
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
                  <Text className="text-xs text-gray-400">{ROLES[code.role]}</Text>
                  <Copy size={14} color="#9ca3af" />
                </View>
              </Pressable>
            ))}
          </Card>
        )}

        <View className="flex-row items-center gap-2">
          <UsersIcon size={20} color="#2563eb" />
          <Text className="text-lg font-semibold text-gray-700">Kullanıcı Listesi</Text>
        </View>

        {profilesQuery.isLoading ? (
          <LoadingState label="Kullanıcılar yükleniyor..." />
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={<UserCog size={48} color="#9ca3af" />}
            title="Henüz kullanıcı yok"
            description="Yukarıdan davet kodu üreterek yeni kullanıcıları kuruma davet edin."
          />
        ) : (
          profiles.map((p) => {
            const isExpanded = expandedUserId === p.id;
            const isAssigning = assignLoadingId === p.id;
            const tName = teamName(p.team_id);
            return (
              <Card key={p.id} className="gap-3">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-semibold text-gray-800">{p.name}</Text>
                    {p.id === profile.id ? (
                      <View className="rounded bg-brand-100 px-1.5 py-0.5">
                        <Text className="text-xs font-medium text-brand-700">Siz</Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="mt-1.5 flex-row items-center gap-1.5">
                    <Shield size={14} color="#9ca3af" />
                    <Text className="text-sm text-gray-500">{ROLES[p.role]}</Text>
                  </View>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <UsersIcon size={14} color="#9ca3af" />
                    <Text className="text-sm text-gray-500">
                      Takım: {tName ?? 'Atanmamış'}
                    </Text>
                  </View>
                </View>

                <Button
                  label={isExpanded ? 'Kapat' : 'Takıma Ata'}
                  variant={isExpanded ? 'ghost' : 'secondary'}
                  icon={
                    isExpanded ? <X size={18} color="#2563eb" /> : <UserCog size={18} color="#2563eb" />
                  }
                  onPress={() => setExpandedUserId(isExpanded ? null : p.id)}
                />

                {isExpanded && (
                  <View className="gap-2 border-t border-gray-100 pt-3">
                    <Text className="text-sm font-medium text-gray-700">Takım Seç</Text>
                    {teams.length === 0 ? (
                      <Text className="text-sm text-gray-400">
                        Önce Takımlar sekmesinden bir takım oluşturun.
                      </Text>
                    ) : (
                      <View className="flex-row flex-wrap gap-2">
                        {p.team_id !== null && (
                          <Pressable
                            onPress={() => handleAssign(p.id, null)}
                            disabled={isAssigning}
                            className={`rounded-lg px-3 py-2 ${isAssigning ? 'bg-gray-200' : 'bg-red-100'}`}
                          >
                            <Text className="text-sm font-medium text-red-700">
                              Takımdan Çıkar
                            </Text>
                          </Pressable>
                        )}
                        {teams.map((t) => {
                          const selected = p.team_id === t.id;
                          return (
                            <Pressable
                              key={t.id}
                              onPress={() => handleAssign(p.id, t.id)}
                              disabled={isAssigning}
                              className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'} ${isAssigning ? 'opacity-50' : ''}`}
                            >
                              {selected ? <Check size={14} color="#fff" /> : null}
                              <Text
                                className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                              >
                                {t.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
