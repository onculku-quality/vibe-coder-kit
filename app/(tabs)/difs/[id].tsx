import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Check,
  CalendarDays,
  UserCheck,
  ClipboardList,
  History,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import {
  useDif,
  useDifStatusHistory,
  useUpdateDif,
  useChangeDifStatus,
  useDeleteDif,
} from '@/hooks/useDifs';
import { useAudits } from '@/hooks/useAudits';
import { usePlans } from '@/hooks/usePlans';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
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

const NEXT_STATUS: Partial<Record<DifStatus, DifStatus>> = {
  acik: 'inceleniyor',
  inceleniyor: 'onaylanmis',
  onaylanmis: 'kapali',
};

export default function DifDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const difId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
  const router = useRouter();
  const { profile } = useAuth();
  const institutionId = profile?.institution_id ?? null;

  const difQuery = useDif(difId);
  const historyQuery = useDifStatusHistory(difId);
  const auditsQuery = useAudits(institutionId);
  const plansQuery = usePlans(institutionId);
  const updateDif = useUpdateDif(profile as Profile);
  const changeStatus = useChangeDifStatus(profile as Profile);
  const deleteDif = useDeleteDif(profile as Profile);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editRootCause, setEditRootCause] = useState('');
  const [editAction, setEditAction] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const dif = difQuery.data ?? null;
  const history = historyQuery.data ?? [];
  const audits = auditsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  const isReviewer = profile?.role === 'admin' || profile?.role === 'bas_denetci';
  const isCreator = !!dif && dif.created_by === profile?.id;
  const canEdit = isReviewer || (isCreator && dif?.status === 'acik');

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

  function startEdit() {
    if (!dif) return;
    setEditTitle(dif.title);
    setEditSource(dif.source ?? '');
    setEditRootCause(dif.root_cause ?? '');
    setEditAction(dif.action ?? '');
    setEditResponsible(dif.responsible ?? '');
    setEditDueDate(dif.due_date ?? '');
    setEditError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!dif) return;
    if (!editTitle.trim()) {
      setEditError('DİF başlığı zorunludur.');
      return;
    }
    if (editDueDate && !isValidDate(editDueDate)) {
      setEditError('Termin tarihi YYYY-MM-DD formatında olmalı.');
      return;
    }
    setEditError(null);
    try {
      await updateDif.mutateAsync({
        id: dif.id,
        title: editTitle,
        source: editSource,
        rootCause: editRootCause,
        action: editAction,
        responsible: editResponsible,
        dueDate: editDueDate,
      });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'DİF güncellenemedi.');
    }
  }

  function handleAdvance() {
    if (!dif) return;
    const next = NEXT_STATUS[dif.status];
    if (!next) return;
    Alert.alert(
      'Durumu İlerlet',
      `DİF durumu "${DIF_STATUS[dif.status]}" → "${DIF_STATUS[next]}" olarak değiştirilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await changeStatus.mutateAsync({ difId: dif.id, status: next });
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Durum değiştirilemedi.'
              );
            }
          },
        },
      ]
    );
  }

  function handleSetStatus(status: DifStatus) {
    if (!dif) return;
    Alert.alert(
      'Durumu Değiştir',
      `DİF durumu "${DIF_STATUS[status]}" olarak ayarlansın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await changeStatus.mutateAsync({ difId: dif.id, status });
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Durum değiştirilemedi.'
              );
            }
          },
        },
      ]
    );
  }

  function handleDelete() {
    if (!dif) return;
    Alert.alert(
      'DİF\'i Sil',
      `"${dif.title}" DİF kaydını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDif.mutateAsync({ difId: dif.id });
              router.back();
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'DİF silinemedi.'
              );
            }
          },
        },
      ]
    );
  }

  if (!difId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState message="Geçersiz DİF." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (difQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="DİF yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (difQuery.error || !dif) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState message="DİF bulunamadı." onRetry={() => difQuery.refetch()} />
      </SafeAreaView>
    );
  }

  const nextStatus = NEXT_STATUS[dif.status];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 self-start">
          <ArrowLeft size={20} color="#2563eb" />
          <Text className="text-base font-medium text-brand-600">Geri</Text>
        </Pressable>

        <View>
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-2xl font-bold text-gray-800">{dif.title}</Text>
            <View
              className="rounded-lg px-2.5 py-1"
              style={{ backgroundColor: DIF_STATUS_COLOR[dif.status] }}
            >
              <Text className="text-xs font-semibold text-white">
                {DIF_STATUS[dif.status]}
              </Text>
            </View>
          </View>
          <View className="mt-1.5 flex-row items-center gap-1.5">
            <ClipboardList size={14} color="#9ca3af" />
            <Text className="text-sm text-gray-500">Denetim: {auditLabel(dif.audit_id)}</Text>
          </View>
        </View>

        {isReviewer && nextStatus && (
          <Button
            label={`Durumu İlerlet: ${DIF_STATUS[nextStatus]}`}
            icon={<Check size={18} color="#fff" />}
            loading={changeStatus.isPending}
            disabled={changeStatus.isPending}
            onPress={handleAdvance}
          />
        )}

        {isReviewer && (
          <Card className="gap-3">
            <Text className="text-sm font-medium text-gray-700">Durum Değiştir</Text>
            <View className="flex-row flex-wrap gap-2">
              {DIF_STATUS_ORDER.map((s) => {
                const selected = dif.status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => handleSetStatus(s)}
                    disabled={changeStatus.isPending || selected}
                    className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                      selected ? 'border-2 border-transparent' : 'bg-gray-100'
                    } ${changeStatus.isPending ? 'opacity-50' : ''}`}
                    style={selected ? { backgroundColor: DIF_STATUS_COLOR[s] } : undefined}
                  >
                    {selected ? <Check size={14} color="#fff" /> : null}
                    <Text
                      className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                    >
                      {DIF_STATUS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {editing ? (
          <Card className="gap-4">
            <Text className="text-base font-semibold text-gray-700">DİF Düzenle</Text>
            <Input label="DİF Başlığı *" value={editTitle} onChangeText={setEditTitle} />
            <Input
              label="Kaynak / Bulgunun Konumu"
              value={editSource}
              onChangeText={setEditSource}
              autoCapitalize="sentences"
            />
            <Input
              label="Kök Neden"
              value={editRootCause}
              onChangeText={setEditRootCause}
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              className="text-start"
            />
            <Input
              label="Aksiyon / Düzeltici Faaliyet"
              value={editAction}
              onChangeText={setEditAction}
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              className="text-start"
            />
            <Input
              label="Sorumlu"
              value={editResponsible}
              onChangeText={setEditResponsible}
              autoCapitalize="words"
            />
            <Input
              label="Termin"
              value={editDueDate}
              onChangeText={setEditDueDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
            {editError && (
              <View className="rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{editError}</Text>
              </View>
            )}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="İptal"
                  variant="secondary"
                  onPress={() => setEditing(false)}
                  disabled={updateDif.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Kaydet"
                  loading={updateDif.isPending}
                  onPress={handleSave}
                />
              </View>
            </View>
          </Card>
        ) : (
          <Card className="gap-3">
            <DetailRow label="Kaynak / Konum" value={dif.source} />
            <DetailRow label="Kök Neden" value={dif.root_cause} />
            <DetailRow label="Aksiyon / Düzeltici Faaliyet" value={dif.action} />
            <View className="flex-row items-center gap-1.5">
              <UserCheck size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">
                Sorumlu: {dif.responsible || '—'}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={14} color="#9ca3af" />
              <Text className="text-sm text-gray-500">
                Termin: {dif.due_date ? new Date(dif.due_date + 'T00:00:00').toLocaleDateString('tr-TR') : '—'}
              </Text>
            </View>

            {canEdit ? (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Düzenle"
                    variant="secondary"
                    icon={<Pencil size={18} color="#2563eb" />}
                    onPress={startEdit}
                  />
                </View>
                {isReviewer ? (
                  <View className="flex-1">
                    <Button
                      label="Sil"
                      variant="danger"
                      icon={<Trash2 size={18} color="#fff" />}
                      onPress={handleDelete}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        )}

        {history.length > 0 && (
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <History size={18} color="#2563eb" />
              <Text className="text-base font-semibold text-gray-700">Durum Geçmişi</Text>
            </View>
            {history.map((h) => (
              <View key={h.id} className="flex-row items-start gap-2">
                <View className="mt-1.5 h-2 w-2 rounded-full bg-brand-500" />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm text-gray-700">
                      {h.from_status ? DIF_STATUS[h.from_status] : '—'}
                    </Text>
                    <Text className="text-xs text-gray-400">→</Text>
                    <Text className="text-sm font-semibold text-gray-800">
                      {DIF_STATUS[h.to_status]}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">
                    {new Date(h.created_at).toLocaleString('tr-TR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                    {h.note ? ` · ${h.note}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View>
      <Text className="text-xs font-medium text-gray-400">{label}</Text>
      <Text className="text-sm text-gray-700">{value || '—'}</Text>
    </View>
  );
}
