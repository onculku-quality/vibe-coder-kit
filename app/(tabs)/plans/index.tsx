import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  CalendarDays,
  ClipboardList,
  Clock,
  Tag,
  Users as UsersIcon,
  BookOpen,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/hooks/usePlans';
import { useStandards } from '@/hooks/useStandards';
import { useTeams } from '@/hooks/useTeams';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { PLAN_STATUS, PLAN_STATUS_ORDER } from '@/constants/statuses';
import type { AgendaItem, Plan, PlanStatus, Profile } from '@/lib/types';

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}

function isValidTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s);
}

interface FormState {
  name: string;
  standardId: string | null;
  auditDate: string;
  teamId: string | null;
  departments: string[];
  agenda: AgendaItem[];
  status: PlanStatus;
}

function emptyForm(): FormState {
  return {
    name: '',
    standardId: null,
    auditDate: '',
    teamId: null,
    departments: [],
    agenda: [],
    status: 'planlandi',
  };
}

function planToForm(plan: Plan): FormState {
  return {
    name: plan.name,
    standardId: plan.standard_id,
    auditDate: plan.audit_date ?? '',
    teamId: plan.team_id,
    departments: plan.departments ?? [],
    agenda: plan.hourly_agenda ?? [],
    status: plan.status,
  };
}

export default function PlansScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const institutionId = profile?.institution_id ?? null;

  const plansQuery = usePlans(institutionId);
  const standardsQuery = useStandards(institutionId);
  const teamsQuery = useTeams(institutionId);
  const createPlan = useCreatePlan(profile as Profile);
  const updatePlan = useUpdatePlan(profile as Profile);
  const deletePlan = useDeletePlan(profile as Profile);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [deptInput, setDeptInput] = useState('');
  const [agendaInput, setAgendaInput] = useState<AgendaItem>({ time: '', title: '', description: '' });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const plans = plansQuery.data ?? [];
  const standards = standardsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  function standardName(id: string | null): string | null {
    if (!id) return null;
    const found = standards.find((s) => s.id === id);
    return found ? found.name : null;
  }

  function teamName(id: string | null): string | null {
    if (!id) return null;
    const found = teams.find((t) => t.id === id);
    return found ? found.name : null;
  }

  function resetForm() {
    setForm(emptyForm());
    setFormError(null);
    setDeptInput('');
    setAgendaInput({ time: '', title: '', description: '' });
    setShowForm(false);
    setEditingId(null);
  }

  function startCreate() {
    setForm(emptyForm());
    setFormError(null);
    setDeptInput('');
    setAgendaInput({ time: '', title: '', description: '' });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(plan: Plan) {
    setForm(planToForm(plan));
    setFormError(null);
    setDeptInput('');
    setAgendaInput({ time: '', title: '', description: '' });
    setEditingId(plan.id);
    setShowForm(true);
  }

  function addDepartment() {
    const v = deptInput.trim();
    if (!v) return;
    if (form.departments.includes(v)) {
      setFormError('Bu departman zaten ekli.');
      return;
    }
    setForm((f) => ({ ...f, departments: [...f.departments, v] }));
    setDeptInput('');
    setFormError(null);
  }

  function removeDepartment(d: string) {
    setForm((f) => ({ ...f, departments: f.departments.filter((x) => x !== d) }));
  }

  function addAgendaItem() {
    const item = {
      time: agendaInput.time.trim(),
      title: agendaInput.title.trim(),
      description: (agendaInput.description ?? '').trim() || undefined,
    };
    if (!isValidTime(item.time)) {
      setFormError('Ajanda saati HH:MM formatında olmalı (örn: 09:30).');
      return;
    }
    if (!item.title) {
      setFormError('Ajanda başlığı zorunludur.');
      return;
    }
    setForm((f) => ({ ...f, agenda: [...f.agenda, item] }));
    setAgendaInput({ time: '', title: '', description: '' });
    setFormError(null);
  }

  function removeAgendaItem(idx: number) {
    setForm((f) => ({ ...f, agenda: f.agenda.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError('Plan adı zorunludur.');
      return;
    }
    if (form.auditDate && !isValidDate(form.auditDate)) {
      setFormError('Tarih YYYY-MM-DD formatında olmalı (örn: 2025-07-15).');
      return;
    }
    setFormError(null);
    const payload = {
      name: form.name,
      standardId: form.standardId,
      auditDate: form.auditDate || null,
      teamId: form.teamId,
      departments: form.departments,
      hourlyAgenda: form.agenda,
      status: form.status,
    };
    try {
      if (editingId) {
        await updatePlan.mutateAsync({ id: editingId, ...payload });
      } else {
        await createPlan.mutateAsync(payload);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Plan kaydedilemedi.');
    }
  }

  function handleDelete(plan: Plan) {
    Alert.alert(
      'Planı Sil',
      `"${plan.name}" planını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(plan.id);
            try {
              await deletePlan.mutateAsync(plan.id);
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Plan silinemedi.'
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

  if (profile.role !== 'admin' && profile.role !== 'bas_denetci') {
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

  if (plansQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Planlar yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (plansQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Planlar yüklenemedi."
          onRetry={() => plansQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Denetim Planları</Text>
          <Pressable
            onPress={showForm ? resetForm : startCreate}
            className="flex-row items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2"
          >
            {showForm ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
            <Text className="text-sm font-semibold text-white">
              {showForm ? 'İptal' : 'Yeni Plan'}
            </Text>
          </Pressable>
        </View>

        {showForm && (
          <Card className="gap-4">
            <Text className="text-lg font-semibold text-gray-700">
              {editingId ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}
            </Text>

            <Input
              label="Plan Adı *"
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Örn: 2025 Q3 İç Denetim"
            />

            <Input
              label="Denetim Tarihi"
              value={form.auditDate}
              onChangeText={(v) => setForm((f) => ({ ...f, auditDate: v }))}
              placeholder="YYYY-MM-DD (örn: 2025-07-15)"
              keyboardType="numbers-and-punctuation"
            />

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-700">Standart</Text>
              {standardsQuery.isLoading ? (
                <Text className="text-sm text-gray-400">Standartlar yükleniyor...</Text>
              ) : standards.length === 0 ? (
                <Text className="text-sm text-gray-400">
                  Henüz standart yok. Standartlar sekmesinden oluşturun.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, standardId: null }))}
                    className={`rounded-lg px-3 py-2 ${form.standardId === null ? 'bg-brand-600' : 'bg-gray-100'}`}
                  >
                    <Text
                      className={`text-sm font-medium ${form.standardId === null ? 'text-white' : 'text-gray-700'}`}
                    >
                      Standart yok
                    </Text>
                  </Pressable>
                  {standards.map((s) => {
                    const selected = form.standardId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setForm((f) => ({ ...f, standardId: s.id }))}
                        className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
                      >
                        {selected ? <Check size={14} color="#fff" /> : null}
                        <Text
                          className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                        >
                          {s.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-700">Takım</Text>
              {teamsQuery.isLoading ? (
                <Text className="text-sm text-gray-400">Takımlar yükleniyor...</Text>
              ) : teams.length === 0 ? (
                <Text className="text-sm text-gray-400">
                  Henüz takım yok. Takımlar sekmesinden oluşturun.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, teamId: null }))}
                    className={`rounded-lg px-3 py-2 ${form.teamId === null ? 'bg-brand-600' : 'bg-gray-100'}`}
                  >
                    <Text
                      className={`text-sm font-medium ${form.teamId === null ? 'text-white' : 'text-gray-700'}`}
                    >
                      Takım yok
                    </Text>
                  </Pressable>
                  {teams.map((t) => {
                    const selected = form.teamId === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setForm((f) => ({ ...f, teamId: t.id }))}
                        className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
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

            <View className="gap-2">
              <View className="flex-row items-center gap-1.5">
                <Tag size={16} color="#6b7280" />
                <Text className="text-sm font-medium text-gray-700">Departmanlar</Text>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    label=""
                    value={deptInput}
                    onChangeText={setDeptInput}
                    placeholder="Örn: Üretim"
                    autoCapitalize="words"
                  />
                </View>
                <View className="justify-end">
                  <Pressable
                    onPress={addDepartment}
                    className="flex-row items-center gap-1 rounded-xl bg-gray-200 px-4 py-3.5"
                  >
                    <Plus size={18} color="#374151" />
                    <Text className="text-sm font-semibold text-gray-900">Ekle</Text>
                  </Pressable>
                </View>
              </View>
              {form.departments.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  {form.departments.map((d) => (
                    <View
                      key={d}
                      className="flex-row items-center gap-1.5 rounded-lg bg-brand-100 px-3 py-1.5"
                    >
                      <Text className="text-sm font-medium text-brand-700">{d}</Text>
                      <Pressable onPress={() => removeDepartment(d)} hitSlop={8}>
                        <X size={14} color="#2563eb" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="gap-2">
              <View className="flex-row items-center gap-1.5">
                <Clock size={16} color="#6b7280" />
                <Text className="text-sm font-medium text-gray-700">Saatlik Ajanda</Text>
              </View>
              {form.agenda.length > 0 && (
                <View className="gap-2">
                  {form.agenda.map((item, idx) => (
                    <View
                      key={`${item.time}-${idx}`}
                      className="flex-row items-start justify-between rounded-xl bg-gray-50 px-3 py-2"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="font-mono text-sm font-semibold text-gray-700">
                            {item.time}
                          </Text>
                          <Text className="text-sm text-gray-800">{item.title}</Text>
                        </View>
                        {item.description ? (
                          <Text className="mt-0.5 pl-4 text-xs text-gray-400">
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable onPress={() => removeAgendaItem(idx)} hitSlop={8}>
                        <Trash2 size={16} color="#dc2626" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <View className="gap-2 rounded-xl bg-gray-50 p-3">
                <View className="flex-row gap-2">
                  <View className="w-24">
                    <Input
                      label="Saat"
                      value={agendaInput.time}
                      onChangeText={(v) =>
                        setAgendaInput((a) => ({ ...a, time: v }))
                      }
                      placeholder="09:30"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Başlık"
                      value={agendaInput.title}
                      onChangeText={(v) =>
                        setAgendaInput((a) => ({ ...a, title: v }))
                      }
                      placeholder="Açılış toplantısı"
                    />
                  </View>
                </View>
                <Input
                  label="Açıklama"
                  value={agendaInput.description}
                  onChangeText={(v) =>
                    setAgendaInput((a) => ({ ...a, description: v }))
                  }
                  placeholder="İsteğe bağlı"
                  autoCapitalize="sentences"
                />
                <Pressable
                  onPress={addAgendaItem}
                  className="flex-row items-center justify-center gap-1 rounded-xl bg-gray-200 py-3"
                >
                  <Plus size={18} color="#374151" />
                  <Text className="text-sm font-semibold text-gray-900">Ajanda Ekle</Text>
                </Pressable>
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-700">Durum</Text>
              <View className="flex-row flex-wrap gap-2">
                {PLAN_STATUS_ORDER.map((s) => {
                  const selected = form.status === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setForm((f) => ({ ...f, status: s }))}
                      className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
                    >
                      {selected ? <Check size={14} color="#fff" /> : null}
                      <Text
                        className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                      >
                        {PLAN_STATUS[s]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
                  disabled={createPlan.isPending || updatePlan.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={editingId ? 'Kaydet' : 'Oluştur'}
                  loading={createPlan.isPending || updatePlan.isPending}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          </Card>
        )}

        {plans.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={48} color="#9ca3af" />}
            title="Henüz plan yok"
            description="Denetim planı oluşturmak için 'Yeni Plan' düğmesine basın."
          />
        ) : (
          plans.map((plan) => {
            const sName = standardName(plan.standard_id);
            const tName = teamName(plan.team_id);
            return (
              <Card key={plan.id} className="gap-3">
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/plans/[id]', params: { id: plan.id } })
                  }
                  className="active:opacity-70"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="flex-1 text-lg font-semibold text-gray-800">
                      {plan.name}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <View className="rounded-lg bg-gray-100 px-2.5 py-1">
                        <Text className="text-xs font-semibold text-gray-700">
                          {PLAN_STATUS[plan.status]}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </View>

                  {plan.audit_date ? (
                    <View className="mt-1.5 flex-row items-center gap-1.5">
                      <CalendarDays size={14} color="#9ca3af" />
                      <Text className="text-sm text-gray-500">
                        {new Date(plan.audit_date + 'T00:00:00').toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  ) : null}

                  {sName ? (
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <BookOpen size={14} color="#9ca3af" />
                      <Text className="text-sm text-gray-500">{sName}</Text>
                    </View>
                  ) : null}

                  {tName ? (
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <UsersIcon size={14} color="#9ca3af" />
                      <Text className="text-sm text-gray-500">{tName}</Text>
                    </View>
                  ) : null}

                  {plan.departments && plan.departments.length > 0 ? (
                    <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                      {plan.departments.map((d) => (
                        <View
                          key={d}
                          className="rounded bg-gray-100 px-2 py-0.5"
                        >
                          <Text className="text-xs text-gray-600">{d}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {plan.hourly_agenda && plan.hourly_agenda.length > 0 ? (
                    <View className="mt-2 gap-1 border-t border-gray-100 pt-2">
                      <View className="flex-row items-center gap-1.5">
                        <Clock size={12} color="#9ca3af" />
                        <Text className="text-xs font-medium text-gray-400">Ajanda</Text>
                      </View>
                      {plan.hourly_agenda.map((item, idx) => (
                        <View key={`${item.time}-${idx}`} className="flex-row gap-1.5">
                          <Text className="font-mono text-xs text-gray-500">{item.time}</Text>
                          <Text className="text-xs text-gray-600">{item.title}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Pressable>

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Düzenle"
                      variant="secondary"
                      icon={<Pencil size={18} color="#2563eb" />}
                      onPress={() => startEdit(plan)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Sil"
                      variant="danger"
                      loading={deletingId === plan.id}
                      disabled={deletingId === plan.id}
                      icon={<Trash2 size={18} color="#fff" />}
                      onPress={() => handleDelete(plan)}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
