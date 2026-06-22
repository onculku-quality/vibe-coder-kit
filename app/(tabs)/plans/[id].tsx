import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  BookOpen,
  Users as UsersIcon,
  Clock,
  Plus,
  X,
  Pencil,
  Trash2,
  Check,
  DoorOpen,
  DoorClosed,
  MapPin,
  StickyNote,
  Gavel,
  ListChecks,
  UserCheck,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { usePlan } from '@/hooks/usePlans';
import { useStandards } from '@/hooks/useStandards';
import { useTeams } from '@/hooks/useTeams';
import {
  useMeetingsByPlan,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
} from '@/hooks/useMeetings';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { PLAN_STATUS, MEETING_TYPE } from '@/constants/statuses';
import type {
  Meeting,
  MeetingAgendaItem,
  MeetingDecision,
  MeetingType,
  Plan,
  Profile,
} from '@/lib/types';

interface MeetingFormState {
  meetingDate: string;
  location: string;
  participants: string[];
  agenda: MeetingAgendaItem[];
  decisions: MeetingDecision[];
  notes: string;
}

function emptyMeetingForm(): MeetingFormState {
  return {
    meetingDate: '',
    location: '',
    participants: [],
    agenda: [],
    decisions: [],
    notes: '',
  };
}

function meetingToForm(m: Meeting): MeetingFormState {
  return {
    meetingDate: m.meeting_date ? isoToLocalFormValue(m.meeting_date) : '',
    location: m.location ?? '',
    participants: m.participants ?? [],
    agenda: m.agenda ?? [],
    decisions: m.decisions ?? [],
    notes: m.notes ?? '',
  };
}

function isValidDateTime(s: string): boolean {
  if (!s) return true;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s);
}

function localDateTimeToISO(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(+y, +mo - 1, +d, +h, +mi);
  return date.toISOString();
}

function isoToLocalFormValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
  const router = useRouter();
  const { profile } = useAuth();
  const institutionId = profile?.institution_id ?? null;

  const planQuery = usePlan(planId);
  const standardsQuery = useStandards(institutionId);
  const teamsQuery = useTeams(institutionId);
  const meetingsQuery = useMeetingsByPlan(planId);
  const createMeeting = useCreateMeeting(profile as Profile);
  const updateMeeting = useUpdateMeeting(profile as Profile);
  const deleteMeeting = useDeleteMeeting(profile as Profile);

  const plan = planQuery.data ?? null;
  const meetings = meetingsQuery.data ?? [];
  const standards = standardsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  const canManage = profile?.role === 'admin' || profile?.role === 'bas_denetci';

  function standardName(idVal: string | null): string | null {
    if (!idVal) return null;
    const found = standards.find((s) => s.id === idVal);
    return found ? found.name : null;
  }
  function teamName(idVal: string | null): string | null {
    if (!idVal) return null;
    const found = teams.find((t) => t.id === idVal);
    return found ? found.name : null;
  }

  const acilis = meetings.find((m) => m.type === 'acilis') ?? null;
  const kapanis = meetings.find((m) => m.type === 'kapanis') ?? null;

  function handleDeleteMeeting(m: Meeting, planName: string) {
    Alert.alert(
      'Toplantıyı Sil',
      `${MEETING_TYPE[m.type]} silmek istediğinize emin misiniz? (${planName})`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeeting.mutateAsync({ id: m.id, planId: m.plan_id, type: m.type });
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Toplantı silinemedi.'
              );
            }
          },
        },
      ]
    );
  }

  if (!planId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState message="Geçersiz plan." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (planQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Plan yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (planQuery.error || !plan) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Plan bulunamadı."
          onRetry={() => planQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 self-start">
          <ArrowLeft size={20} color="#2563eb" />
          <Text className="text-base font-medium text-brand-600">Geri</Text>
        </Pressable>

        <View>
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-2xl font-bold text-gray-800">{plan.name}</Text>
            <View className="rounded-lg bg-gray-100 px-2.5 py-1">
              <Text className="text-xs font-semibold text-gray-700">
                {PLAN_STATUS[plan.status]}
              </Text>
            </View>
          </View>

          {plan.audit_date ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <CalendarDays size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">
                {new Date(plan.audit_date + 'T00:00:00').toLocaleDateString('tr-TR')}
              </Text>
            </View>
          ) : null}
          {standardName(plan.standard_id) ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <BookOpen size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">{standardName(plan.standard_id)}</Text>
            </View>
          ) : null}
          {teamName(plan.team_id) ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <UsersIcon size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">{teamName(plan.team_id)}</Text>
            </View>
          ) : null}
          {plan.departments && plan.departments.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {plan.departments.map((d) => (
                <View key={d} className="rounded bg-gray-100 px-2 py-0.5">
                  <Text className="text-xs text-gray-600">{d}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {plan.hourly_agenda && plan.hourly_agenda.length > 0 ? (
            <View className="mt-3 gap-1">
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
        </View>

        {meetingsQuery.error ? (
          <View className="rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-sm font-medium text-red-700">
              Toplantılar yüklenemedi.
            </Text>
            <Text className="mt-1 text-xs text-red-600">
              {meetingsQuery.error instanceof Error
                ? meetingsQuery.error.message
                : 'Bilinmeyen hata.'}
            </Text>
            <View className="mt-2 self-start">
              <Button
                label="Tekrar Dene"
                variant="secondary"
                onPress={() => meetingsQuery.refetch()}
              />
            </View>
          </View>
        ) : null}

        <MeetingSection
          type="acilis"
          plan={plan}
          meeting={acilis}
          canManage={canManage}
          creating={createMeeting.isPending}
          updating={updateMeeting.isPending}
          onCreate={(form) =>
            createMeeting.mutateAsync({
              planId: plan.id,
              institutionId: plan.institution_id,
              type: 'acilis',
              meetingDate: localDateTimeToISO(form.meetingDate),
              location: form.location,
              participants: form.participants,
              agenda: form.agenda,
              decisions: form.decisions,
              notes: form.notes,
            })
          }
          onUpdate={(form) => {
            if (!acilis) return Promise.resolve();
            return updateMeeting.mutateAsync({
              id: acilis.id,
              institutionId: plan.institution_id,
              planId: plan.id,
              type: 'acilis',
              meetingDate: localDateTimeToISO(form.meetingDate),
              location: form.location,
              participants: form.participants,
              agenda: form.agenda,
              decisions: form.decisions,
              notes: form.notes,
            });
          }}
          onDelete={() => acilis && handleDeleteMeeting(acilis, plan.name)}
        />

        <MeetingSection
          type="kapanis"
          plan={plan}
          meeting={kapanis}
          canManage={canManage}
          creating={createMeeting.isPending}
          updating={updateMeeting.isPending}
          onCreate={(form) =>
            createMeeting.mutateAsync({
              planId: plan.id,
              institutionId: plan.institution_id,
              type: 'kapanis',
              meetingDate: localDateTimeToISO(form.meetingDate),
              location: form.location,
              participants: form.participants,
              agenda: form.agenda,
              decisions: form.decisions,
              notes: form.notes,
            })
          }
          onUpdate={(form) => {
            if (!kapanis) return Promise.resolve();
            return updateMeeting.mutateAsync({
              id: kapanis.id,
              institutionId: plan.institution_id,
              planId: plan.id,
              type: 'kapanis',
              meetingDate: localDateTimeToISO(form.meetingDate),
              location: form.location,
              participants: form.participants,
              agenda: form.agenda,
              decisions: form.decisions,
              notes: form.notes,
            });
          }}
          onDelete={() => kapanis && handleDeleteMeeting(kapanis, plan.name)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

interface MeetingSectionProps {
  type: MeetingType;
  plan: Plan;
  meeting: Meeting | null;
  canManage: boolean;
  creating: boolean;
  updating: boolean;
  onCreate: (form: MeetingFormState) => Promise<unknown>;
  onUpdate: (form: MeetingFormState) => Promise<unknown>;
  onDelete: () => void;
}

function MeetingSection({
  type,
  plan,
  meeting,
  canManage,
  creating,
  updating,
  onCreate,
  onUpdate,
  onDelete,
}: MeetingSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MeetingFormState>(emptyMeetingForm());
  const [error, setError] = useState<string | null>(null);

  const [participantInput, setParticipantInput] = useState('');
  const [agendaInput, setAgendaInput] = useState<MeetingAgendaItem>({
    title: '',
    description: '',
  });
  const [decisionInput, setDecisionInput] = useState<MeetingDecision>({
    text: '',
    responsible: '',
  });

  const Icon = type === 'acilis' ? DoorOpen : DoorClosed;

  function beginCreate() {
    setForm(emptyMeetingForm());
    setParticipantInput('');
    setAgendaInput({ title: '', description: '' });
    setDecisionInput({ text: '', responsible: '' });
    setError(null);
    setEditing(true);
  }

  function beginEdit() {
    if (!meeting) return;
    setForm(meetingToForm(meeting));
    setParticipantInput('');
    setAgendaInput({ title: '', description: '' });
    setDecisionInput({ text: '', responsible: '' });
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function addParticipant() {
    const v = participantInput.trim();
    if (!v) return;
    if (form.participants.includes(v)) {
      setError('Bu katılımcı zaten ekli.');
      return;
    }
    setForm((f) => ({ ...f, participants: [...f.participants, v] }));
    setParticipantInput('');
    setError(null);
  }
  function removeParticipant(p: string) {
    setForm((f) => ({ ...f, participants: f.participants.filter((x) => x !== p) }));
  }

  function addAgenda() {
    const item = {
      title: agendaInput.title.trim(),
      description: (agendaInput.description ?? '').trim() || undefined,
    };
    if (!item.title) {
      setError('Gündem başlığı zorunludur.');
      return;
    }
    setForm((f) => ({ ...f, agenda: [...f.agenda, item] }));
    setAgendaInput({ title: '', description: '' });
    setError(null);
  }
  function removeAgenda(idx: number) {
    setForm((f) => ({ ...f, agenda: f.agenda.filter((_, i) => i !== idx) }));
  }

  function addDecision() {
    const item = {
      text: decisionInput.text.trim(),
      responsible: (decisionInput.responsible ?? '').trim() || undefined,
    };
    if (!item.text) {
      setError('Karar metni zorunludur.');
      return;
    }
    setForm((f) => ({ ...f, decisions: [...f.decisions, item] }));
    setDecisionInput({ text: '', responsible: '' });
    setError(null);
  }
  function removeDecision(idx: number) {
    setForm((f) => ({ ...f, decisions: f.decisions.filter((_, i) => i !== idx) }));
  }

  async function submit() {
    if (form.meetingDate && !isValidDateTime(form.meetingDate)) {
      setError('Tarih/saat formatı: YYYY-MM-DD HH:MM (örn: 2025-07-15 09:30).');
      return;
    }
    setError(null);
    try {
      if (meeting) {
        await onUpdate(form);
      } else {
        await onCreate(form);
      }
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplantı kaydedilemedi.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Toplantıyı Sil',
      `${MEETING_TYPE[type]} silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: onDelete },
      ]
    );
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-2">
        <Icon size={20} color="#2563eb" />
        <Text className="text-lg font-semibold text-gray-800">{MEETING_TYPE[type]}</Text>
        {meeting ? (
          <View className="ml-auto rounded bg-green-100 px-2 py-0.5">
            <Text className="text-xs font-medium text-green-700">Kayıtlı</Text>
          </View>
        ) : (
          <View className="ml-auto rounded bg-gray-100 px-2 py-0.5">
            <Text className="text-xs font-medium text-gray-500">Yok</Text>
          </View>
        )}
      </View>

      {!editing && meeting ? (
        <>
          {meeting.meeting_date ? (
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">
                {new Date(meeting.meeting_date).toLocaleString('tr-TR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </Text>
            </View>
          ) : null}
          {meeting.location ? (
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">{meeting.location}</Text>
            </View>
          ) : null}
          {meeting.participants && meeting.participants.length > 0 ? (
            <DetailList
              icon={<UserCheck size={12} color="#9ca3af" />}
              title="Katılımcılar"
              items={meeting.participants.map((p) => ({ primary: p }))}
            />
          ) : null}
          {meeting.agenda && meeting.agenda.length > 0 ? (
            <DetailList
              icon={<ListChecks size={12} color="#9ca3af" />}
              title="Gündem"
              items={meeting.agenda.map((a) => ({
                primary: a.title,
                secondary: a.description,
              }))}
            />
          ) : null}
          {meeting.decisions && meeting.decisions.length > 0 ? (
            <DetailList
              icon={<Gavel size={12} color="#9ca3af" />}
              title="Kararlar"
              items={meeting.decisions.map((d) => ({
                primary: d.text,
                secondary: d.responsible ? `Sorumlu: ${d.responsible}` : undefined,
              }))}
            />
          ) : null}
          {meeting.notes ? (
            <View className="gap-1">
              <View className="flex-row items-center gap-1.5">
                <StickyNote size={12} color="#9ca3af" />
                <Text className="text-xs font-medium text-gray-400">Notlar</Text>
              </View>
              <Text className="text-sm text-gray-600">{meeting.notes}</Text>
            </View>
          ) : null}

          {canManage ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Düzenle"
                  variant="secondary"
                  icon={<Pencil size={18} color="#2563eb" />}
                  onPress={beginEdit}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Sil"
                  variant="danger"
                  icon={<Trash2 size={18} color="#fff" />}
                  onPress={confirmDelete}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {!editing && !meeting && canManage ? (
        <Button
          label={`${MEETING_TYPE[type]} Oluştur`}
          icon={<Plus size={18} color="#fff" />}
          onPress={beginCreate}
        />
      ) : null}

      {!editing && !meeting && !canManage ? (
        <Text className="text-sm text-gray-400">
          Henüz {MEETING_TYPE[type].toLowerCase()} oluşturulmamış.
        </Text>
      ) : null}

      {editing ? (
        <View className="gap-3 border-t border-gray-100 pt-3">
          <Input
            label="Tarih & Saat"
            value={form.meetingDate}
            onChangeText={(v) => setForm((f) => ({ ...f, meetingDate: v }))}
            placeholder="YYYY-MM-DD HH:MM (örn: 2025-07-15 09:30)"
          />
          <Input
            label="Konum"
            value={form.location}
            onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
            placeholder="Örn: Konferans Salonu"
            autoCapitalize="words"
          />

          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <UserCheck size={16} color="#6b7280" />
              <Text className="text-sm font-medium text-gray-700">Katılımcılar</Text>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label=""
                  value={participantInput}
                  onChangeText={setParticipantInput}
                  placeholder="Ad Soyad"
                  autoCapitalize="words"
                />
              </View>
              <View className="justify-end">
                <Pressable
                  onPress={addParticipant}
                  className="flex-row items-center gap-1 rounded-xl bg-gray-200 px-4 py-3.5"
                >
                  <Plus size={18} color="#374151" />
                  <Text className="text-sm font-semibold text-gray-900">Ekle</Text>
                </Pressable>
              </View>
            </View>
            {form.participants.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {form.participants.map((p) => (
                  <View
                    key={p}
                    className="flex-row items-center gap-1.5 rounded-lg bg-brand-100 px-3 py-1.5"
                  >
                    <Text className="text-sm font-medium text-brand-700">{p}</Text>
                    <Pressable onPress={() => removeParticipant(p)} hitSlop={8}>
                      <X size={14} color="#2563eb" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <ListChecks size={16} color="#6b7280" />
              <Text className="text-sm font-medium text-gray-700">Gündem</Text>
            </View>
            {form.agenda.length > 0 ? (
              <View className="gap-2">
                {form.agenda.map((item, idx) => (
                  <View
                    key={`${item.title}-${idx}`}
                    className="flex-row items-start justify-between rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <View className="flex-1">
                      <Text className="text-sm text-gray-800">{item.title}</Text>
                      {item.description ? (
                        <Text className="mt-0.5 text-xs text-gray-400">{item.description}</Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => removeAgenda(idx)} hitSlop={8}>
                      <Trash2 size={16} color="#dc2626" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View className="gap-2 rounded-xl bg-gray-50 p-3">
              <Input
                label="Başlık"
                value={agendaInput.title}
                onChangeText={(v) => setAgendaInput((a) => ({ ...a, title: v }))}
                placeholder="Gündem maddesi"
              />
              <Input
                label="Açıklama"
                value={agendaInput.description ?? ''}
                onChangeText={(v) => setAgendaInput((a) => ({ ...a, description: v }))}
                placeholder="İsteğe bağlı"
                autoCapitalize="sentences"
                multiline
                numberOfLines={2}
                className="text-start"
              />
              <Pressable
                onPress={addAgenda}
                className="flex-row items-center justify-center gap-1 rounded-xl bg-gray-200 py-3"
              >
                <Plus size={18} color="#374151" />
                <Text className="text-sm font-semibold text-gray-900">Gündem Ekle</Text>
              </Pressable>
            </View>
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Gavel size={16} color="#6b7280" />
              <Text className="text-sm font-medium text-gray-700">Kararlar</Text>
            </View>
            {form.decisions.length > 0 ? (
              <View className="gap-2">
                {form.decisions.map((item, idx) => (
                  <View
                    key={`${item.text}-${idx}`}
                    className="flex-row items-start justify-between rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <View className="flex-1">
                      <Text className="text-sm text-gray-800">{item.text}</Text>
                      {item.responsible ? (
                        <Text className="mt-0.5 text-xs text-gray-400">
                          Sorumlu: {item.responsible}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => removeDecision(idx)} hitSlop={8}>
                      <Trash2 size={16} color="#dc2626" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View className="gap-2 rounded-xl bg-gray-50 p-3">
              <Input
                label="Karar"
                value={decisionInput.text}
                onChangeText={(v) => setDecisionInput((d) => ({ ...d, text: v }))}
                placeholder="Alınan karar"
                autoCapitalize="sentences"
                multiline
                numberOfLines={2}
                className="text-start"
              />
              <Input
                label="Sorumlu"
                value={decisionInput.responsible ?? ''}
                onChangeText={(v) => setDecisionInput((d) => ({ ...d, responsible: v }))}
                placeholder="İsteğe bağlı"
                autoCapitalize="words"
              />
              <Pressable
                onPress={addDecision}
                className="flex-row items-center justify-center gap-1 rounded-xl bg-gray-200 py-3"
              >
                <Plus size={18} color="#374151" />
                <Text className="text-sm font-semibold text-gray-900">Karar Ekle</Text>
              </Pressable>
            </View>
          </View>

          <Input
            label="Notlar"
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="İsteğe bağlı genel notlar"
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            className="text-start"
          />

          {error ? (
            <View className="rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="İptal" variant="secondary" onPress={cancel} disabled={creating || updating} />
            </View>
            <View className="flex-1">
              <Button
                label={meeting ? 'Kaydet' : 'Oluştur'}
                loading={creating || updating}
                onPress={submit}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

interface DetailListProps {
  icon: React.ReactNode;
  title: string;
  items: { primary: string; secondary?: string }[];
}

function DetailList({ icon, title, items }: DetailListProps) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs font-medium text-gray-400">{title}</Text>
      </View>
      {items.map((it, idx) => (
        <View key={`${it.primary}-${idx}`} className="flex-row gap-1.5 pl-4">
          <Check size={12} color="#9ca3af" />
          <View className="flex-1">
            <Text className="text-sm text-gray-600">{it.primary}</Text>
            {it.secondary ? (
              <Text className="text-xs text-gray-400">{it.secondary}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
