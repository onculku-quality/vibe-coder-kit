import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Plus,
  X,
  FileWarning,
  ChevronRight,
  CalendarDays,
  UserCheck,
  Filter,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useDifs, useCreateDif } from '@/hooks/useDifs';
import { useAudits, useAuditAnswers } from '@/hooks/useAudits';
import { usePlans } from '@/hooks/usePlans';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { DIF_STATUS, DIF_STATUS_COLOR, DIF_STATUS_ORDER } from '@/constants/statuses';
import type { DifStatus, Profile } from '@/lib/types';

function isValidDate(s: string): boolean {
  if (!s) return true;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export default function DifsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ audit_id?: string; answer_id?: string }>();
  const institutionId = profile?.institution_id ?? null;

  const difsQuery = useDifs(institutionId);
  const auditsQuery = useAudits(institutionId);
  const plansQuery = usePlans(institutionId);
  const createDif = useCreateDif(profile as Profile);

  const [showForm, setShowForm] = useState(false);
  const [formAuditId, setFormAuditId] = useState<string | null>(params.audit_id ?? null);
  const [formAnswerId, setFormAnswerId] = useState<string | null>(params.answer_id ?? null);
  const [formTitle, setFormTitle] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formRootCause, setFormRootCause] = useState('');
  const [formAction, setFormAction] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<DifStatus | 'all'>('all');

  const difs = difsQuery.data ?? [];
  const allAudits = auditsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  const canCreateAny =
    profile?.role === 'admin' || profile?.role === 'bas_denetci';
  const audits = canCreateAny
    ? allAudits
    : allAudits.filter((a) => a.assigned_to === profile?.id);

  const selectedAudit = formAuditId
    ? audits.find((a) => a.id === formAuditId) ?? null
    : null;
  const answersQuery = useAuditAnswers(
    formAuditId,
    selectedAudit?.standard_id ?? null
  );

  function planName(planId: string | null): string | null {
    if (!planId) return null;
    const found = plans.find((p) => p.id === planId);
    return found ? found.name : null;
  }
  function auditLabel(auditId: string): string {
    const found = audits.find((a) => a.id === auditId);
    if (!found) return 'Denetim';
    return planName(found.plan_id) ?? 'Denetim';
  }

  const filteredDifs =
    statusFilter === 'all' ? difs : difs.filter((d) => d.status === statusFilter);

  function resetForm() {
    setFormAuditId(null);
    setFormAnswerId(null);
    setFormTitle('');
    setFormSource('');
    setFormRootCause('');
    setFormAction('');
    setFormResponsible('');
    setFormDueDate('');
    setFormError(null);
    setShowForm(false);
  }

  async function handleCreate() {
    if (!formAuditId) {
      setFormError('Denetim seçimi zorunludur.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('DİF başlığı zorunludur.');
      return;
    }
    if (formDueDate && !isValidDate(formDueDate)) {
      setFormError('Termin tarihi YYYY-MM-DD formatında olmalı (örn: 2025-08-01).');
      return;
    }
    setFormError(null);
    try {
      await createDif.mutateAsync({
        institutionId: institutionId!,
        auditId: formAuditId,
        auditAnswerId: formAnswerId,
        title: formTitle,
        source: formSource,
        rootCause: formRootCause,
        action: formAction,
        responsible: formResponsible,
        dueDate: formDueDate,
      });
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'DİF oluşturulamadı.');
    }
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
            Platform yöneticisi kurum DİF kayıtlarını görüntüleyemez.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (difsQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="DİF kayıtları yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (difsQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState message="DİF kayıtları yüklenemedi." onRetry={() => difsQuery.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">DİF Kayıtları</Text>
          <Pressable
            onPress={() => setShowForm(!showForm)}
            className="flex-row items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2"
          >
            {showForm ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
            <Text className="text-sm font-semibold text-white">
              {showForm ? 'İptal' : 'Yeni DİF'}
            </Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Filter size={16} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-700">Durum Filtresi</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-2 ${statusFilter === 'all' ? 'bg-brand-600' : 'bg-gray-100'}`}
            >
              <Text
                className={`text-sm font-medium ${statusFilter === 'all' ? 'text-white' : 'text-gray-700'}`}
              >
                Tümü ({difs.length})
              </Text>
            </Pressable>
            {DIF_STATUS_ORDER.map((s) => {
              const count = difs.filter((d) => d.status === s).length;
              const selected = statusFilter === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'border-2 border-transparent' : 'bg-gray-100'}`}
                  style={selected ? { backgroundColor: DIF_STATUS_COLOR[s] } : undefined}
                >
                  <Text
                    className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                  >
                    {DIF_STATUS[s]} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showForm && (
          <Card className="gap-4">
            <Text className="text-lg font-semibold text-gray-700">Yeni DİF Oluştur</Text>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-700">Denetim *</Text>
              {auditsQuery.isLoading ? (
                <Text className="text-sm text-gray-400">Denetimler yükleniyor...</Text>
              ) : audits.length === 0 ? (
                <Text className="text-sm text-gray-400">
                  Henüz denetim yok. Önce Denetimler sekmesinden denetçi atayın.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {audits.map((a) => {
                    const selected = formAuditId === a.id;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => {
                          setFormAuditId(a.id);
                          setFormAnswerId(null);
                          setFormError(null);
                        }}
                        className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
                      >
                        <Text
                          className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                        >
                          {auditLabel(a.id)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {formAuditId && answersQuery.data && answersQuery.data.length > 0 && (
              <View className="gap-2">
                <Text className="text-sm font-medium text-gray-700">
                  İlgili Soru (isteğe bağlı)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {answersQuery.data.map((a) => {
                    const selected = formAnswerId === a.id;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => {
                          setFormAnswerId(selected ? null : a.id);
                          setFormError(null);
                        }}
                        className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
                      >
                        <Text
                          className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                          numberOfLines={1}
                        >
                          {a.question}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Input
              label="DİF Başlığı *"
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="Örn: Üretim alanında dokümantasyon eksikliği"
            />
            <Input
              label="Kaynak / Bulgunun Konumu"
              value={formSource}
              onChangeText={setFormSource}
              placeholder="Örn: Üretim hattı 2, sks-kayıt dosyası"
              autoCapitalize="sentences"
            />
            <Input
              label="Kök Neden"
              value={formRootCause}
              onChangeText={setFormRootCause}
              placeholder="Uygunsuzluğun kök nedeni"
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              className="text-start"
            />
            <Input
              label="Aksiyon / Düzeltici Faaliyet"
              value={formAction}
              onChangeText={setFormAction}
              placeholder="Alınacak düzeltici/önleyici faaliyet"
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              className="text-start"
            />
            <Input
              label="Sorumlu"
              value={formResponsible}
              onChangeText={setFormResponsible}
              placeholder="Ad Soyad"
              autoCapitalize="words"
            />
            <Input
              label="Termin"
              value={formDueDate}
              onChangeText={setFormDueDate}
              placeholder="YYYY-MM-DD (örn: 2025-08-01)"
              keyboardType="numbers-and-punctuation"
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
                  disabled={createDif.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Oluştur"
                  loading={createDif.isPending}
                  onPress={handleCreate}
                />
              </View>
            </View>
          </Card>
        )}

        {filteredDifs.length === 0 ? (
          <EmptyState
            icon={<FileWarning size={48} color="#9ca3af" />}
            title={statusFilter === 'all' ? 'Henüz DİF kaydı yok' : 'Bu durumda DİF yok'}
            description={
              statusFilter === 'all'
                ? "Uygunsuz bulgudan DİF açmak için 'Yeni DİF' düğmesine basın."
                : 'Farklı bir durum filtresi seçin.'
            }
          />
        ) : (
          filteredDifs.map((dif) => (
            <Card key={dif.id} className="gap-3">
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/difs/[id]', params: { id: dif.id } })
                }
                className="active:opacity-70"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-800">{dif.title}</Text>
                    {dif.responsible ? (
                      <View className="mt-1.5 flex-row items-center gap-1.5">
                        <UserCheck size={14} color="#9ca3af" />
                        <Text className="text-sm text-gray-500">Sorumlu: {dif.responsible}</Text>
                      </View>
                    ) : null}
                    {dif.due_date ? (
                      <View className="mt-1 flex-row items-center gap-1.5">
                        <CalendarDays size={14} color="#9ca3af" />
                        <Text className="text-sm text-gray-500">
                          Termin: {new Date(dif.due_date + 'T00:00:00').toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    ) : null}
                    <Text className="mt-1 text-xs text-gray-400">
                      Denetim: {auditLabel(dif.audit_id)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <View
                      className="rounded-lg px-2.5 py-1"
                      style={{ backgroundColor: DIF_STATUS_COLOR[dif.status] }}
                    >
                      <Text className="text-xs font-semibold text-white">
                        {DIF_STATUS[dif.status]}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9ca3af" />
                  </View>
                </View>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
