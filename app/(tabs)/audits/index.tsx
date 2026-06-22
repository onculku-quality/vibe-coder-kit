import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ClipboardCheck,
  Plus,
  X,
  Trash2,
  ChevronRight,
  UserCheck,
  CalendarDays,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { usePlans } from '@/hooks/usePlans';
import { useProfiles } from '@/hooks/useProfiles';
import { useAudits, useCreateAudit, useDeleteAudit } from '@/hooks/useAudits';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ROLES } from '@/constants/roles';
import { AUDIT_STATUS } from '@/constants/statuses';
import type { Profile } from '@/lib/types';

export default function AuditsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const institutionId = profile?.institution_id ?? null;

  const auditsQuery = useAudits(institutionId);
  const plansQuery = usePlans(institutionId);
  const profilesQuery = useProfiles(institutionId);
  const createAudit = useCreateAudit(profile as Profile);
  const deleteAudit = useDeleteAudit(profile as Profile);

  const [showForm, setShowForm] = useState(false);
  const [formPlanId, setFormPlanId] = useState<string | null>(null);
  const [formAssignee, setFormAssignee] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const audits = auditsQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

  const canAssign = profile?.role === 'admin' || profile?.role === 'bas_denetci';

  function planName(id: string | null): string | null {
    if (!id) return null;
    const found = plans.find((p) => p.id === id);
    return found ? found.name : null;
  }
  function assigneeName(id: string | null): string | null {
    if (!id) return null;
    const found = profiles.find((p) => p.id === id);
    return found ? found.name : null;
  }
  function planStandardId(planId: string | null): string | null {
    if (!planId) return null;
    const found = plans.find((p) => p.id === planId);
    return found ? found.standard_id : null;
  }

  function resetForm() {
    setFormPlanId(null);
    setFormAssignee(null);
    setFormError(null);
    setShowForm(false);
  }

  async function handleCreate() {
    if (!formPlanId) {
      setFormError('Plan seçimi zorunludur.');
      return;
    }
    if (!formAssignee) {
      setFormError('Denetçi seçimi zorunludur.');
      return;
    }
    if (!planStandardId(formPlanId)) {
      setFormError('Seçilen planın bir standardı yok. Önce plana standart atayın.');
      return;
    }
    setFormError(null);
    try {
      await createAudit.mutateAsync({
        planId: formPlanId,
        institutionId: institutionId!,
        standardId: planStandardId(formPlanId),
        assignedTo: formAssignee,
      });
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Denetim oluşturulamadı.');
    }
  }

  function handleDelete(auditId: string) {
    Alert.alert(
      'Denetimi Sil',
      'Bu denetimi ve tüm cevaplarını silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(auditId);
            try {
              await deleteAudit.mutateAsync({ auditId });
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Denetim silinemedi.'
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (profile.role === 'platform_admini') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-medium text-gray-600">
            Platform yöneticisi kurum denetimlerini görüntüleyemez.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (auditsQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Denetimler yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (auditsQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Denetimler yüklenemedi."
          onRetry={() => auditsQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const visibleAudits = canAssign
    ? audits
    : audits.filter((a) => a.assigned_to === profile.id);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Denetimler</Text>
          {canAssign ? (
            <Pressable
              onPress={() => setShowForm(!showForm)}
              className="flex-row items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2"
            >
              {showForm ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
              <Text className="text-sm font-semibold text-white">
                {showForm ? 'İptal' : 'Denetçi Ata'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {canAssign && showForm && (
          <Card className="gap-4">
            <Text className="text-lg font-semibold text-gray-700">Denetçi Ata</Text>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-700">Plan *</Text>
              {plansQuery.isLoading ? (
                <Text className="text-sm text-gray-400">Planlar yükleniyor...</Text>
              ) : plans.length === 0 ? (
                <Text className="text-sm text-gray-400">
                  Henüz plan yok. Önce Planlar sekmesinden plan oluşturun.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {plans.map((p) => {
                    const selected = formPlanId === p.id;
                    const hasStandard = !!p.standard_id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          setFormPlanId(p.id);
                          setFormError(null);
                        }}
                        disabled={!hasStandard}
                        className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                          selected ? 'bg-brand-600' : hasStandard ? 'bg-gray-100' : 'bg-gray-50'
                        } ${!hasStandard ? 'opacity-50' : ''}`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            selected ? 'text-white' : hasStandard ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          {p.name}
                        </Text>
                        {!hasStandard ? (
                          <Text className="text-xs text-red-500">standart yok</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-700">Denetçi *</Text>
              {profilesQuery.isLoading ? (
                <Text className="text-sm text-gray-400">Kullanıcılar yükleniyor...</Text>
              ) : profiles.length === 0 ? (
                <Text className="text-sm text-gray-400">
                  Henüz kullanıcı yok. Kullanıcılar sekmesinden davet edin.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {profiles.map((p) => {
                    const selected = formAssignee === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          setFormAssignee(p.id);
                          setFormError(null);
                        }}
                        className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                          selected ? 'bg-brand-600' : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            selected ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {p.name}
                        </Text>
                        <Text
                          className={`text-xs ${selected ? 'text-white/80' : 'text-gray-400'}`}
                        >
                          {ROLES[p.role]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

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
                  disabled={createAudit.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Ata"
                  loading={createAudit.isPending}
                  onPress={handleCreate}
                />
              </View>
            </View>
          </Card>
        )}

        {visibleAudits.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={48} color="#9ca3af" />}
            title={canAssign ? 'Henüz denetim yok' : 'Size atanmış denetim yok'}
            description={
              canAssign
                ? "Denetçi atamak için 'Denetçi Ata' düğmesine basın."
                : 'Baş denetçiniz size bir denetim atadığında burada görünür.'
            }
          />
        ) : (
          visibleAudits.map((audit) => {
            const pName = planName(audit.plan_id);
            const aName = assigneeName(audit.assigned_to);
            return (
              <Card key={audit.id} className="gap-3">
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/audits/[id]', params: { id: audit.id } })
                  }
                  className="active:opacity-70"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {pName ?? 'Denetim'}
                      </Text>
                      {aName ? (
                        <View className="mt-1.5 flex-row items-center gap-1.5">
                          <UserCheck size={14} color="#9ca3af" />
                          <Text className="text-sm text-gray-500">Denetçi: {aName}</Text>
                        </View>
                      ) : null}
                      <View className="mt-1 flex-row items-center gap-1.5">
                        <CalendarDays size={14} color="#9ca3af" />
                        <Text className="text-sm text-gray-500">
                          {new Date(audit.created_at).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <View className="rounded-lg bg-gray-100 px-2.5 py-1">
                        <Text className="text-xs font-semibold text-gray-700">
                          {AUDIT_STATUS[audit.status]}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </View>
                </Pressable>

                {canAssign ? (
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        label="Aç"
                        variant="secondary"
                        icon={<ChevronRight size={18} color="#2563eb" />}
                        onPress={() =>
                          router.push({ pathname: '/audits/[id]', params: { id: audit.id } })
                        }
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Sil"
                        variant="danger"
                        loading={deletingId === audit.id}
                        disabled={deletingId === audit.id}
                        icon={<Trash2 size={18} color="#fff" />}
                        onPress={() => handleDelete(audit.id)}
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Denetimi Aç"
                    icon={<ChevronRight size={18} color="#fff" />}
                    onPress={() =>
                      router.push({ pathname: '/audits/[id]', params: { id: audit.id } })
                    }
                  />
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
