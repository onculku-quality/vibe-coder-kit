import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Users as UsersIcon,
  MapPin,
  Crown,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
} from '@/hooks/useTeams';
import { useProfiles } from '@/hooks/useProfiles';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ROLES } from '@/constants/roles';
import type { Profile, Team } from '@/lib/types';

export default function TeamsScreen() {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id ?? null;

  const teamsQuery = useTeams(institutionId);
  const profilesQuery = useProfiles(institutionId);
  const createTeam = useCreateTeam(profile as Profile);
  const updateTeam = useUpdateTeam(profile as Profile);
  const deleteTeam = useDeleteTeam(profile as Profile);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formLeaderId, setFormLeaderId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLeaderId, setEditLeaderId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const profiles = profilesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  function leaderName(id: string | null): string | null {
    if (!id) return null;
    const found = profiles.find((p) => p.id === id);
    return found ? found.name : null;
  }

  function memberCount(teamId: string): number {
    return profiles.filter((p) => p.team_id === teamId).length;
  }

  function resetForm() {
    setFormName('');
    setFormLocation('');
    setFormLeaderId(null);
    setFormError(null);
    setShowForm(false);
  }

  function startEdit(team: Team) {
    setEditingId(team.id);
    setEditName(team.name);
    setEditLocation(team.location ?? '');
    setEditLeaderId(team.leader_id);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleCreate() {
    if (!formName.trim()) {
      setFormError('Takım adı zorunludur.');
      return;
    }
    setFormError(null);
    try {
      await createTeam.mutateAsync({
        name: formName,
        location: formLocation,
        leaderId: formLeaderId,
      });
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Takım oluşturulamadı.');
    }
  }

  async function handleUpdate(teamId: string) {
    if (!editName.trim()) {
      setEditError('Takım adı zorunludur.');
      return;
    }
    setEditError(null);
    try {
      await updateTeam.mutateAsync({
        id: teamId,
        name: editName,
        location: editLocation,
        leaderId: editLeaderId,
      });
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Takım güncellenemedi.');
    }
  }

  function handleDelete(team: Team) {
    Alert.alert(
      'Takımı Sil',
      `"${team.name}" takımını silmek istediğinize emin misiniz? Takımdaki kullanıcılar takımsız kalır.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(team.id);
            try {
              await deleteTeam.mutateAsync(team.id);
            } catch (err) {
              Alert.alert(
                'Hata',
                err instanceof Error ? err.message : 'Takım silinemedi.'
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

  if (teamsQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Takımlar yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (teamsQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Takımlar yüklenemedi."
          onRetry={() => teamsQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Takımlar</Text>
          <Pressable
            onPress={() => setShowForm(!showForm)}
            className="flex-row items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2"
          >
            {showForm ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
            <Text className="text-sm font-semibold text-white">
              {showForm ? 'İptal' : 'Yeni Takım'}
            </Text>
          </Pressable>
        </View>

        {showForm && (
          <Card className="gap-4">
            <Text className="text-lg font-semibold text-gray-700">Yeni Takım Oluştur</Text>
            <Input
              label="Takım Adı *"
              value={formName}
              onChangeText={setFormName}
              placeholder="Örn: Üretim Denetim Ekibi"
            />
            <Input
              label="Konum"
              value={formLocation}
              onChangeText={setFormLocation}
              placeholder="Örn: Merkez Fabrika"
              autoCapitalize="words"
            />
            <LeaderPicker
              profiles={profiles}
              selectedId={formLeaderId}
              onSelect={setFormLeaderId}
              loading={profilesQuery.isLoading}
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
                  disabled={createTeam.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Oluştur"
                  loading={createTeam.isPending}
                  onPress={handleCreate}
                />
              </View>
            </View>
          </Card>
        )}

        {teams.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={48} color="#9ca3af" />}
            title="Henüz takım yok"
            description="İlk takımı oluşturmak için 'Yeni Takım' düğmesine basın."
          />
        ) : (
          teams.map((team) => {
            const isEditing = editingId === team.id;
            return (
              <Card key={team.id} className="gap-3">
                {isEditing ? (
                  <>
                    <Text className="text-base font-semibold text-gray-700">
                      Takımı Düzenle
                    </Text>
                    <Input
                      label="Takım Adı *"
                      value={editName}
                      onChangeText={setEditName}
                    />
                    <Input
                      label="Konum"
                      value={editLocation}
                      onChangeText={setEditLocation}
                      autoCapitalize="words"
                    />
                    <LeaderPicker
                      profiles={profiles}
                      selectedId={editLeaderId}
                      onSelect={setEditLeaderId}
                      loading={profilesQuery.isLoading}
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
                          disabled={updateTeam.isPending}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Kaydet"
                          loading={updateTeam.isPending}
                          onPress={() => handleUpdate(team.id)}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">{team.name}</Text>
                      {team.location ? (
                        <View className="mt-1.5 flex-row items-center gap-1.5">
                          <MapPin size={14} color="#9ca3af" />
                          <Text className="text-sm text-gray-500">{team.location}</Text>
                        </View>
                      ) : null}
                      {leaderName(team.leader_id) ? (
                        <View className="mt-1 flex-row items-center gap-1.5">
                          <Crown size={14} color="#f59e0b" />
                          <Text className="text-sm text-gray-500">
                            Lider: {leaderName(team.leader_id)}
                          </Text>
                        </View>
                      ) : null}
                      <View className="mt-1.5 flex-row items-center gap-1.5">
                        <UsersIcon size={14} color="#9ca3af" />
                        <Text className="text-sm text-gray-500">
                          {memberCount(team.id)} üye
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button
                          label="Düzenle"
                          variant="secondary"
                          icon={<Pencil size={18} color="#2563eb" />}
                          onPress={() => startEdit(team)}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Sil"
                          variant="danger"
                          loading={deletingId === team.id}
                          disabled={deletingId === team.id}
                          icon={<Trash2 size={18} color="#fff" />}
                          onPress={() => handleDelete(team)}
                        />
                      </View>
                    </View>
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

interface LeaderPickerProps {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading: boolean;
}

function LeaderPicker({ profiles, selectedId, onSelect, loading }: LeaderPickerProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-gray-700">Lider</Text>
      {loading ? (
        <Text className="text-sm text-gray-400">Kullanıcılar yükleniyor...</Text>
      ) : profiles.length === 0 ? (
        <Text className="text-sm text-gray-400">Atanabilir kullanıcı yok.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => onSelect(null)}
            className={`rounded-lg px-3 py-2 ${selectedId === null ? 'bg-brand-600' : 'bg-gray-100'}`}
          >
            <Text
              className={`text-sm font-medium ${selectedId === null ? 'text-white' : 'text-gray-700'}`}
            >
              Lider yok
            </Text>
          </Pressable>
          {profiles.map((p) => {
            const selected = selectedId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => onSelect(p.id)}
                className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${selected ? 'bg-brand-600' : 'bg-gray-100'}`}
              >
                {selected ? <Check size={14} color="#fff" /> : null}
                <Text
                  className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}
                >
                  {p.name}
                </Text>
                <Text className={`text-xs ${selected ? 'text-white/80' : 'text-gray-400'}`}>
                  {ROLES[p.role]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
