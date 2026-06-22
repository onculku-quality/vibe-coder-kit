import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  X,
  Check,
  HelpCircle,
  ImageOff,
  CheckCircle2,
  CircleDashed,
  FileWarning,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useAudit, useAuditAnswers, useUpdateAnswer, useAddEvidence, useRemoveEvidence, useUpdateAuditStatus } from '@/hooks/useAudits';
import { usePlans } from '@/hooks/usePlans';
import { getSignedEvidenceUrl } from '@/lib/storage';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import {
  ANSWER_VALUE,
  ANSWER_VALUE_COLOR,
  ANSWER_VALUE_ORDER,
  AUDIT_STATUS,
  AUDIT_STATUS_ORDER,
} from '@/constants/statuses';
import type { AnswerValue, AuditAnswerWithQuestion, AuditStatus, Profile } from '@/lib/types';

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

export default function AuditDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auditId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
  const router = useRouter();
  const { profile } = useAuth();

  const auditQuery = useAudit(auditId);
  const plansQuery = usePlans(profile?.institution_id ?? null);
  const updateAnswer = useUpdateAnswer(profile as Profile);
  const updateStatus = useUpdateAuditStatus(profile as Profile);

  const audit = auditQuery.data ?? null;
  const answersQuery = useAuditAnswers(auditId, audit?.standard_id ?? null);
  const answers = answersQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  function planName(planId: string | null): string | null {
    if (!planId) return null;
    const found = plans.find((p) => p.id === planId);
    return found ? found.name : null;
  }

  const isAssignee = !!audit && audit.assigned_to === profile?.id;
  const canManage =
    profile?.role === 'admin' || profile?.role === 'bas_denetci' || isAssignee;

  function changeStatus(status: AuditStatus) {
    if (!auditId) return;
    Alert.alert(
      'Durumu Değiştir',
      `Denetim durumu "${AUDIT_STATUS[status]}" olarak değiştirilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({ auditId, status });
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Durum güncellenemedi.'
              );
            }
          },
        },
      ]
    );
  }

  if (!auditId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState message="Geçersiz denetim." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (auditQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Denetim yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (auditQuery.error || !audit) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Denetim bulunamadı."
          onRetry={() => auditQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const answeredCount = answers.filter((a) => a.answer !== null).length;
  const progress = answers.length > 0 ? Math.round((answeredCount / answers.length) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 self-start">
          <ArrowLeft size={20} color="#2563eb" />
          <Text className="text-base font-medium text-brand-600">Geri</Text>
        </Pressable>

        <View>
          <Text className="text-2xl font-bold text-gray-800">
            {planName(audit.plan_id) ?? 'Denetim'}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <View className="rounded-lg bg-gray-100 px-2.5 py-1">
              <Text className="text-xs font-semibold text-gray-700">
                {AUDIT_STATUS[audit.status]}
              </Text>
            </View>
            <Text className="text-sm text-gray-500">
              {answeredCount}/{answers.length} soru cevaplandı ({progress}%)
            </Text>
          </View>
        </View>

        {canManage && (
          <Card className="gap-3">
            <Text className="text-sm font-medium text-gray-700">Durum</Text>
            <View className="flex-row flex-wrap gap-2">
              {AUDIT_STATUS_ORDER.map((s) => {
                const selected = audit.status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => changeStatus(s)}
                    disabled={updateStatus.isPending}
                    className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                      selected ? 'bg-brand-600' : 'bg-gray-100'
                    } ${updateStatus.isPending ? 'opacity-50' : ''}`}
                  >
                    {selected ? <Check size={14} color="#fff" /> : null}
                    <Text
                      className={`text-sm font-medium ${
                        selected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {AUDIT_STATUS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {answersQuery.isLoading ? (
          <LoadingState label="Sorular yükleniyor..." />
        ) : answersQuery.error ? (
          <ErrorState
            message="Sorular yüklenemedi."
            onRetry={() => answersQuery.refetch()}
          />
        ) : answers.length === 0 ? (
          <EmptyState
            icon={<HelpCircle size={48} color="#9ca3af" />}
            title="Soru bulunamadı"
            description="Bu denetimin planına ait standartta soru yok. Standartlar sekmesinden soru ekleyin."
          />
        ) : (
          answers.map((a, idx) => (
            <AnswerCard
              key={`${a.id}-${a.updated_at}`}
              answer={a}
              index={idx}
              institutionId={audit.institution_id}
              auditId={audit.id}
              canEdit={canManage}
              saving={updateAnswer.isPending}
              onSave={(vals) =>
                updateAnswer.mutateAsync({
                  answerId: a.id,
                  auditId: audit.id,
                  institutionId: audit.institution_id,
                  ...vals,
                })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface AnswerCardProps {
  answer: AuditAnswerWithQuestion;
  index: number;
  institutionId: string;
  auditId: string;
  canEdit: boolean;
  saving: boolean;
  onSave: (vals: {
    answer: AnswerValue | null;
    responsible: string | null;
    dueDate: string | null;
    notes: string | null;
  }) => Promise<unknown>;
}

function AnswerCard({
  answer,
  index,
  institutionId,
  auditId,
  canEdit,
  saving,
  onSave,
}: AnswerCardProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [value, setValue] = useState<AnswerValue | null>(answer.answer);
  const [responsible, setResponsible] = useState(answer.responsible ?? '');
  const [dueDate, setDueDate] = useState(answer.due_date ?? '');
  const [notes, setNotes] = useState(answer.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const addEvidence = useAddEvidence(profile as Profile);
  const removeEvidence = useRemoveEvidence(profile as Profile);

  async function handleSave() {
    if (dueDate && !isValidDate(dueDate)) {
      setError('Termin tarihi YYYY-MM-DD formatında olmalı (örn: 2025-08-01).');
      return;
    }
    setError(null);
    try {
      await onSave({
        answer: value,
        responsible: responsible || null,
        dueDate: dueDate || null,
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cevap kaydedilemedi.');
    }
  }

  async function handleAddPhoto() {
    try {
      await addEvidence.mutateAsync({
        answerId: answer.id,
        auditId,
        institutionId,
      });
    } catch (err) {
      Alert.alert(
        'Hata',
        err instanceof Error ? err.message : 'Fotoğraf eklenemedi.'
      );
    }
  }

  function handleRemovePhoto(path: string) {
    Alert.alert('Kanıtı Sil', 'Bu kanıt fotoğrafını silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeEvidence.mutateAsync({
              answerId: answer.id,
              auditId,
              path,
            });
          } catch (err) {
            Alert.alert(
              'Hata',
              err instanceof Error ? err.message : 'Kanıt silinemedi.'
            );
          }
        },
      },
    ]);
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-start gap-2">
        <Text className="mt-0.5 text-sm font-semibold text-gray-400">{index + 1}.</Text>
        <View className="flex-1">
          {answer.section ? (
            <View className="mb-1 self-start rounded bg-brand-100 px-1.5 py-0.5">
              <Text className="text-xs font-medium text-brand-700">{answer.section}</Text>
            </View>
          ) : null}
          <View className="flex-row items-start gap-1.5">
            <HelpCircle size={14} color="#6b7280" />
            <Text className="flex-1 text-base font-medium text-gray-800">{answer.question}</Text>
          </View>
          {answer.guidance ? (
            <Text className="mt-1 pl-5 text-xs text-gray-400">{answer.guidance}</Text>
          ) : null}
        </View>
      </View>

      {canEdit ? (
        <>
          <View className="gap-2">
            <Text className="text-sm font-medium text-gray-700">Cevap</Text>
            <View className="flex-row flex-wrap gap-2">
              {ANSWER_VALUE_ORDER.map((v) => {
                const selected = value === v;
                const color = ANSWER_VALUE_COLOR[v];
                return (
                  <Pressable
                    key={v}
                    onPress={() => setValue(v)}
                    className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 border-2 ${
                      selected ? 'border-transparent' : 'border-gray-200 bg-white'
                    }`}
                    style={selected ? { backgroundColor: color } : undefined}
                  >
                    {selected ? <Check size={14} color="#fff" /> : null}
                    <Text
                      className={`text-sm font-semibold ${
                        selected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {ANSWER_VALUE[v]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {value === null ? (
              <View className="flex-row items-center gap-1.5">
                <CircleDashed size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400">Henüz cevaplanmadı</Text>
              </View>
            ) : null}
          </View>

          <Input
            label="Sorumlu Kişi"
            value={responsible}
            onChangeText={setResponsible}
            placeholder="Ad Soyad"
            autoCapitalize="words"
          />
          <Input
            label="Termin"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD (örn: 2025-08-01)"
            keyboardType="numbers-and-punctuation"
          />
          <Input
            label="Not"
            value={notes}
            onChangeText={setNotes}
            placeholder="Açıklama / bulgu detayı"
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
              <Button
                label="Kaydet"
                loading={saving}
                onPress={handleSave}
              />
            </View>
            {saved ? (
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={20} color="#16a34a" />
                <Text className="text-sm font-medium text-green-600">Kaydedildi</Text>
              </View>
            ) : null}
          </View>

          {(value === 'uygun_degil' || value === 'kismen') && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/difs',
                  params: { audit_id: auditId, answer_id: answer.id },
                })
              }
              className="flex-row items-center justify-center gap-1.5 rounded-xl bg-amber-100 py-3"
            >
              <FileWarning size={18} color="#b45309" />
              <Text className="text-sm font-semibold text-amber-800">DİF Aç</Text>
            </Pressable>
          )}

          <EvidencePhotos
            paths={answer.evidence_paths ?? []}
            uploading={addEvidence.isPending}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            removing={removeEvidence.isPending}
          />
        </>
      ) : (
        <>
          {answer.answer ? (
            <View className="flex-row items-center gap-2">
              <View
                className="rounded-lg px-2.5 py-1"
                style={{ backgroundColor: ANSWER_VALUE_COLOR[answer.answer] }}
              >
                <Text className="text-xs font-semibold text-white">
                  {ANSWER_VALUE[answer.answer]}
                </Text>
              </View>
              {answer.responsible ? (
                <Text className="text-sm text-gray-500">Sorumlu: {answer.responsible}</Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-gray-400">Cevaplanmadı</Text>
          )}
          {answer.due_date ? (
            <Text className="text-sm text-gray-500">
              Termin: {new Date(answer.due_date + 'T00:00:00').toLocaleDateString('tr-TR')}
            </Text>
          ) : null}
          {answer.notes ? (
            <Text className="text-sm text-gray-600">{answer.notes}</Text>
          ) : null}
          {(answer.evidence_paths ?? []).length > 0 ? (
            <EvidencePhotos
              paths={answer.evidence_paths ?? []}
              uploading={false}
              onAdd={() => {}}
              onRemove={() => {}}
              removing={false}
              readOnly
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

interface EvidencePhotosProps {
  paths: string[];
  uploading: boolean;
  removing: boolean;
  onAdd: () => void;
  onRemove: (path: string) => void;
  readOnly?: boolean;
}

function EvidencePhotos({
  paths,
  uploading,
  removing,
  onAdd,
  onRemove,
  readOnly,
}: EvidencePhotosProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const latestReq = useRef(0);

  useEffect(() => {
    const myReq = ++latestReq.current;
    let cancelled = false;
    async function load() {
      if (paths.length === 0) {
        setUrls({});
        return;
      }
      setLoadingUrls(true);
      const entries: [string, string | null][] = await Promise.all(
        paths.map(async (p) => {
          const { url } = await getSignedEvidenceUrl(p);
          return [p, url] as [string, string | null];
        })
      );
      if (cancelled || myReq !== latestReq.current) return;
      const map: Record<string, string> = {};
      for (const [p, u] of entries) {
        if (u) map[p] = u;
      }
      setUrls(map);
      setLoadingUrls(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [paths]);

  return (
    <View className="gap-2 border-t border-gray-100 pt-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700">
          Kanıt Fotoğrafları ({paths.length})
        </Text>
        {!readOnly ? (
          <Pressable
            onPress={onAdd}
            disabled={uploading}
            className={`flex-row items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 ${
              uploading ? 'opacity-50' : ''
            }`}
          >
            <Camera size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">
              {uploading ? 'Yükleniyor...' : 'Fotoğraf Çek'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {paths.length === 0 ? (
        <View className="flex-row items-center gap-1.5">
          <ImageOff size={14} color="#9ca3af" />
          <Text className="text-sm text-gray-400">
            {readOnly ? 'Kanıt fotoğrafı yok.' : 'Henüz kanıt eklenmedi.'}
          </Text>
        </View>
      ) : loadingUrls ? (
        <Text className="text-sm text-gray-400">Görüntüler yükleniyor...</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {paths.map((p) => (
            <View key={p} className="relative">
              {urls[p] ? (
                <Image
                  source={{ uri: urls[p] }}
                  className="h-24 w-24 rounded-lg"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-lg bg-gray-100">
                  <ImageOff size={20} color="#9ca3af" />
                </View>
              )}
              {!readOnly ? (
                <Pressable
                  onPress={() => onRemove(p)}
                  disabled={removing}
                  className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1"
                >
                  <X size={12} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
