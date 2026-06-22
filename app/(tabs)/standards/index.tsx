import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ListChecks,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import {
  useStandards,
  useStandardQuestions,
  useCreateStandard,
  useUpdateStandard,
  useDeleteStandard,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '@/hooks/useStandards';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import type { Profile, Standard, StandardQuestion } from '@/lib/types';

export default function StandardsScreen() {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id ?? null;

  const standardsQuery = useStandards(institutionId);
  const createStandard = useCreateStandard(profile as Profile);
  const updateStandard = useUpdateStandard(profile as Profile);
  const deleteStandard = useDeleteStandard(profile as Profile);
  const createQuestion = useCreateQuestion(profile as Profile);
  const updateQuestion = useUpdateQuestion(profile as Profile);
  const deleteQuestion = useDeleteQuestion(profile as Profile);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newQSection, setNewQSection] = useState('');
  const [newQQuestion, setNewQQuestion] = useState('');
  const [newQGuidance, setNewQGuidance] = useState('');
  const [newQError, setNewQError] = useState<string | null>(null);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [eqSection, setEqSection] = useState('');
  const [eqQuestion, setEqQuestion] = useState('');
  const [eqGuidance, setEqGuidance] = useState('');
  const [eqError, setEqError] = useState<string | null>(null);

  const standards = standardsQuery.data ?? [];

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormError(null);
    setShowForm(false);
  }

  function startEdit(std: Standard) {
    setEditingId(std.id);
    setEditName(std.name);
    setEditDescription(std.description ?? '');
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function toggleExpand(std: Standard) {
    const next = expandedId === std.id ? null : std.id;
    setExpandedId(next);
    setNewQSection('');
    setNewQQuestion('');
    setNewQGuidance('');
    setNewQError(null);
    setEditingQuestionId(null);
  }

  async function handleCreate() {
    if (!formName.trim()) {
      setFormError('Standart adı zorunludur.');
      return;
    }
    setFormError(null);
    try {
      await createStandard.mutateAsync({ name: formName, description: formDescription });
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Standart oluşturulamadı.');
    }
  }

  async function handleUpdate(standardId: string) {
    if (!editName.trim()) {
      setEditError('Standart adı zorunludur.');
      return;
    }
    setEditError(null);
    try {
      await updateStandard.mutateAsync({
        id: standardId,
        name: editName,
        description: editDescription,
      });
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Standart güncellenemedi.');
    }
  }

  function handleDelete(std: Standard) {
    Alert.alert(
      'Standartı Sil',
      `"${std.name}" standartını ve tüm sorularını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(std.id);
            try {
              await deleteStandard.mutateAsync(std.id);
              if (expandedId === std.id) setExpandedId(null);
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Standart silinemedi.'
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  async function handleAddQuestion(standardId: string, orderIndex: number) {
    if (!newQQuestion.trim()) {
      setNewQError('Soru metni zorunludur.');
      return;
    }
    setNewQError(null);
    try {
      await createQuestion.mutateAsync({
        standardId,
        question: newQQuestion,
        section: newQSection,
        guidance: newQGuidance,
        orderIndex,
      });
      setNewQSection('');
      setNewQQuestion('');
      setNewQGuidance('');
    } catch (err) {
      setNewQError(err instanceof Error ? err.message : 'Soru eklenemedi.');
    }
  }

  function startEditQuestion(q: StandardQuestion) {
    setEditingQuestionId(q.id);
    setEqSection(q.section ?? '');
    setEqQuestion(q.question);
    setEqGuidance(q.guidance ?? '');
    setEqError(null);
  }

  async function handleUpdateQuestion(q: StandardQuestion) {
    if (!eqQuestion.trim()) {
      setEqError('Soru metni zorunludur.');
      return;
    }
    setEqError(null);
    try {
      await updateQuestion.mutateAsync({
        id: q.id,
        standardId: q.standard_id,
        question: eqQuestion,
        section: eqSection,
        guidance: eqGuidance,
        orderIndex: q.order_index,
      });
      setEditingQuestionId(null);
    } catch (err) {
      setEqError(err instanceof Error ? err.message : 'Soru güncellenemedi.');
    }
  }

  function handleDeleteQuestion(q: StandardQuestion) {
    Alert.alert(
      'Soruyu Sil',
      'Bu soruyu silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuestion.mutateAsync({ id: q.id, standardId: q.standard_id });
              if (editingQuestionId === q.id) setEditingQuestionId(null);
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Soru silinemedi.'
              );
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

  if (standardsQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Standartlar yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (standardsQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Standartlar yüklenemedi."
          onRetry={() => standardsQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Standartlar</Text>
          <Pressable
            onPress={() => setShowForm(!showForm)}
            className="flex-row items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2"
          >
            {showForm ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
            <Text className="text-sm font-semibold text-white">
              {showForm ? 'İptal' : 'Yeni Standart'}
            </Text>
          </Pressable>
        </View>

        {showForm && (
          <Card className="gap-4">
            <Text className="text-lg font-semibold text-gray-700">Yeni Standart Oluştur</Text>
            <Input
              label="Standart Adı *"
              value={formName}
              onChangeText={setFormName}
              placeholder="Örn: SKS Hastane Denetim Standardı"
            />
            <Input
              label="Açıklama"
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="Standart kapsamı (isteğe bağlı)"
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              className="text-start"
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
                  disabled={createStandard.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Oluştur"
                  loading={createStandard.isPending}
                  onPress={handleCreate}
                />
              </View>
            </View>
          </Card>
        )}

        {standards.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={48} color="#9ca3af" />}
            title="Henüz standart yok"
            description="Denetim standartlarını oluşturmak için 'Yeni Standart' düğmesine basın."
          />
        ) : (
          standards.map((std) => {
            const isEditing = editingId === std.id;
            const isExpanded = expandedId === std.id;
            return (
              <Card key={std.id} className="gap-3">
                {isEditing ? (
                  <>
                    <Text className="text-base font-semibold text-gray-700">
                      Standartı Düzenle
                    </Text>
                    <Input
                      label="Standart Adı *"
                      value={editName}
                      onChangeText={setEditName}
                    />
                    <Input
                      label="Açıklama"
                      value={editDescription}
                      onChangeText={setEditDescription}
                      autoCapitalize="sentences"
                      multiline
                      numberOfLines={3}
                      className="text-start"
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
                          onPress={cancelEdit}
                          disabled={updateStandard.isPending}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Kaydet"
                          loading={updateStandard.isPending}
                          onPress={() => handleUpdate(std.id)}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">{std.name}</Text>
                      {std.description ? (
                        <Text className="mt-1 text-sm text-gray-500">{std.description}</Text>
                      ) : null}
                    </View>
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button
                          label={isExpanded ? 'Soruları Gizle' : 'Sorular'}
                          variant="secondary"
                          icon={
                            isExpanded ? (
                              <ChevronUp size={18} color="#2563eb" />
                            ) : (
                              <ChevronDown size={18} color="#2563eb" />
                            )
                          }
                          onPress={() => toggleExpand(std)}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Düzenle"
                          variant="secondary"
                          icon={<Pencil size={18} color="#2563eb" />}
                          onPress={() => startEdit(std)}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Sil"
                          variant="danger"
                          loading={deletingId === std.id}
                          disabled={deletingId === std.id}
                          icon={<Trash2 size={18} color="#fff" />}
                          onPress={() => handleDelete(std)}
                        />
                      </View>
                    </View>

                    {isExpanded && (
                      <QuestionsPanel
                        standardId={std.id}
                        editingQuestionId={editingQuestionId}
                        eqSection={eqSection}
                        eqQuestion={eqQuestion}
                        eqGuidance={eqGuidance}
                        eqError={eqError}
                        onSetEqSection={setEqSection}
                        onSetEqQuestion={setEqQuestion}
                        onSetEqGuidance={setEqGuidance}
                        onStartEditQuestion={startEditQuestion}
                        onCancelEditQuestion={() => setEditingQuestionId(null)}
                        onUpdateQuestion={handleUpdateQuestion}
                        onDeleteQuestion={handleDeleteQuestion}
                        newQSection={newQSection}
                        newQQuestion={newQQuestion}
                        newQGuidance={newQGuidance}
                        newQError={newQError}
                        onSetNewQSection={setNewQSection}
                        onSetNewQQuestion={setNewQQuestion}
                        onSetNewQGuidance={setNewQGuidance}
                        onAddQuestion={handleAddQuestion}
                        adding={createQuestion.isPending}
                        updating={updateQuestion.isPending}
                      />
                    )}
                  </>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface QuestionsPanelProps {
  standardId: string;
  editingQuestionId: string | null;
  eqSection: string;
  eqQuestion: string;
  eqGuidance: string;
  eqError: string | null;
  onSetEqSection: (v: string) => void;
  onSetEqQuestion: (v: string) => void;
  onSetEqGuidance: (v: string) => void;
  onStartEditQuestion: (q: StandardQuestion) => void;
  onCancelEditQuestion: () => void;
  onUpdateQuestion: (q: StandardQuestion) => void;
  onDeleteQuestion: (q: StandardQuestion) => void;
  newQSection: string;
  newQQuestion: string;
  newQGuidance: string;
  newQError: string | null;
  onSetNewQSection: (v: string) => void;
  onSetNewQQuestion: (v: string) => void;
  onSetNewQGuidance: (v: string) => void;
  onAddQuestion: (standardId: string, orderIndex: number) => void;
  adding: boolean;
  updating: boolean;
}

function QuestionsPanel({
  standardId,
  editingQuestionId,
  eqSection,
  eqQuestion,
  eqGuidance,
  eqError,
  onSetEqSection,
  onSetEqQuestion,
  onSetEqGuidance,
  onStartEditQuestion,
  onCancelEditQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  newQSection,
  newQQuestion,
  newQGuidance,
  newQError,
  onSetNewQSection,
  onSetNewQQuestion,
  onSetNewQGuidance,
  onAddQuestion,
  adding,
  updating,
}: QuestionsPanelProps) {
  const questionsQuery = useStandardQuestions(standardId);
  const questions = questionsQuery.data ?? [];

  return (
    <View className="gap-3 border-t border-gray-100 pt-3">
      <View className="flex-row items-center gap-2">
        <ListChecks size={16} color="#2563eb" />
        <Text className="text-sm font-medium text-gray-700">
          Sorular ({questions.length})
        </Text>
      </View>

      {questionsQuery.isLoading ? (
        <Text className="text-sm text-gray-400">Sorular yükleniyor...</Text>
      ) : questionsQuery.error ? (
        <Text className="text-sm text-red-600">Sorular yüklenemedi.</Text>
      ) : questions.length === 0 ? (
        <Text className="text-sm text-gray-400">Henüz soru eklenmemiş.</Text>
      ) : (
        <View className="gap-2">
          {questions.map((q) => {
            const isQEditing = editingQuestionId === q.id;
            return (
              <View key={q.id} className="rounded-xl bg-gray-50 p-3">
                {isQEditing ? (
                  <View className="gap-2">
                    <Input label="Bölüm" value={eqSection} onChangeText={onSetEqSection} placeholder="Örn: Künye" />
                    <Input label="Soru *" value={eqQuestion} onChangeText={onSetEqQuestion} />
                    <Input
                      label="Açıklama / Kriter"
                      value={eqGuidance}
                      onChangeText={onSetEqGuidance}
                      autoCapitalize="sentences"
                      multiline
                      numberOfLines={2}
                      className="text-start"
                    />
                    {eqError && (
                      <Text className="text-sm text-red-600">{eqError}</Text>
                    )}
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button label="İptal" variant="secondary" onPress={onCancelEditQuestion} disabled={updating} />
                      </View>
                      <View className="flex-1">
                        <Button label="Kaydet" loading={updating} onPress={() => onUpdateQuestion(q)} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="gap-1.5">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        {q.section ? (
                          <View className="mb-1 self-start rounded bg-brand-100 px-1.5 py-0.5">
                            <Text className="text-xs font-medium text-brand-700">{q.section}</Text>
                          </View>
                        ) : null}
                        <View className="flex-row items-start gap-1.5">
                          <HelpCircle size={14} color="#6b7280" />
                          <Text className="flex-1 text-sm text-gray-800">{q.question}</Text>
                        </View>
                        {q.guidance ? (
                          <Text className="mt-1 pl-5 text-xs text-gray-400">{q.guidance}</Text>
                        ) : null}
                      </View>
                      <View className="flex-row gap-1.5">
                        <Pressable onPress={() => onStartEditQuestion(q)} className="p-1">
                          <Pencil size={16} color="#2563eb" />
                        </Pressable>
                        <Pressable onPress={() => onDeleteQuestion(q)} className="p-1">
                          <Trash2 size={16} color="#dc2626" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View className="gap-2 rounded-xl bg-gray-50 p-3">
        <Text className="text-sm font-medium text-gray-700">Soru Ekle</Text>
        <Input label="Bölüm" value={newQSection} onChangeText={onSetNewQSection} placeholder="Örn: Künye" />
        <Input label="Soru *" value={newQQuestion} onChangeText={onSetNewQQuestion} placeholder="Soru metni" />
        <Input
          label="Açıklama / Kriter"
          value={newQGuidance}
          onChangeText={onSetNewQGuidance}
          placeholder="İsteğe bağlı kriter/açıklama"
          autoCapitalize="sentences"
          multiline
          numberOfLines={2}
          className="text-start"
        />
        {newQError && (
          <Text className="text-sm text-red-600">{newQError}</Text>
        )}
        <Button
          label="Soru Ekle"
          loading={adding}
          disabled={adding}
          icon={<Plus size={18} color="#fff" />}
          onPress={() => {
            const nextOrder =
              questions.length > 0
                ? Math.max(...questions.map((q) => q.order_index)) + 1
                : 0;
            onAddQuestion(standardId, nextOrder);
          }}
        />
      </View>
    </View>
  );
}
