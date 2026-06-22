import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  CalendarClock,
  Gauge,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useAudits } from '@/hooks/useAudits';
import { useDifs } from '@/hooks/useDifs';
import { useAuditAnswerStats } from '@/hooks/useStats';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ROLES } from '@/constants/roles';
import { daysRemaining } from '@/lib/subscription';
import type { Dif } from '@/lib/types';

function isUpcomingOrOverdue(dif: Dif): boolean {
  if (dif.status === 'kapali') return false;
  if (!dif.due_date) return false;
  const due = new Date(dif.due_date + 'T00:00:00').getTime();
  const diffDays = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

export default function HomeScreen() {
  const { profile, institution } = useAuth();
  const router = useRouter();
  const institutionId = profile?.institution_id ?? null;

  const auditsQuery = useAudits(institutionId);
  const difsQuery = useDifs(institutionId);
  const statsQuery = useAuditAnswerStats(institutionId);

  const remaining = daysRemaining(institution);
  const audits = auditsQuery.data ?? [];
  const difs = difsQuery.data ?? [];
  const stats = statsQuery.data ?? null;

  const isPlatformAdmin = profile?.role === 'platform_admini';
  const isInstitutionUser = profile?.role && profile.role !== 'platform_admini';

  const completedAudits = audits.filter((a) => a.status === 'tamamlandi').length;
  const ongoingAudits = audits.filter((a) => a.status === 'devam_ediyor').length;
  const openDifs = difs.filter(
    (d) => d.status === 'acik' || d.status === 'inceleniyor' || d.status === 'onaylanmis'
  ).length;
  const upcomingDifs = difs.filter(isUpcomingOrOverdue).length;

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Yükleniyor..." />
      </SafeAreaView>
    );
  }

  const loading = auditsQuery.isLoading || difsQuery.isLoading || statsQuery.isLoading;
  const queryError = auditsQuery.error || difsQuery.error || statsQuery.error;

  if (queryError && isInstitutionUser) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Özet yüklenemedi."
          onRetry={() => {
            auditsQuery.refetch();
            difsQuery.refetch();
            statsQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (loading && isInstitutionUser) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Özet yükleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 py-6">
        <Text className="text-2xl font-bold text-gray-800">
          Merhaba, {profile?.name}
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          {profile ? ROLES[profile.role] : ''}
        </Text>

        <View className="mt-6 gap-4">
          {institution && (
            <Card>
              <Text className="text-sm font-medium text-gray-500">Kurum</Text>
              <Text className="mt-1 text-lg font-semibold text-gray-800">
                {institution.name}
              </Text>
              {remaining !== null && (
                <Text className="mt-2 text-sm text-gray-500">
                  Abonelik: {remaining > 0 ? `${remaining} gün kaldı` : 'Süresi doldu'}
                </Text>
              )}
            </Card>
          )}

          {isPlatformAdmin && (
            <Pressable
              onPress={() => router.push('/platform/institutions')}
              className="flex-row items-center justify-between rounded-2xl bg-brand-600 p-4"
            >
              <View className="flex-row items-center gap-3">
                <Building2 size={24} color="#fff" />
                <Text className="text-base font-semibold text-white">Kurum Yönetimi</Text>
              </View>
              <ChevronRight size={24} color="#fff" />
            </Pressable>
          )}

          {isInstitutionUser && (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <SummaryCard
                  icon={<ClipboardCheck size={20} color="#2563eb" />}
                  value={String(audits.length)}
                  label="Toplam Denetim"
                  tint="bg-brand-50"
                />
                <SummaryCard
                  icon={<ClipboardCheck size={20} color="#16a34a" />}
                  value={String(completedAudits)}
                  label="Tamamlanan"
                  tint="bg-green-50"
                />
                <SummaryCard
                  icon={<ClipboardCheck size={20} color="#f59e0b" />}
                  value={String(ongoingAudits)}
                  label="Devam Eden"
                  tint="bg-amber-50"
                />
              </View>

              <View className="flex-row gap-3">
                <SummaryCard
                  icon={<FileWarning size={20} color="#dc2626" />}
                  value={String(openDifs)}
                  label="Açık DİF"
                  tint="bg-red-50"
                />
                <SummaryCard
                  icon={<CalendarClock size={20} color="#f59e0b" />}
                  value={String(upcomingDifs)}
                  label="Termin ≤ 7 gün"
                  tint="bg-amber-50"
                />
                <SummaryCard
                  icon={<Gauge size={20} color="#2563eb" />}
                  value={stats?.complianceRate !== null && stats?.complianceRate !== undefined ? `%${stats.complianceRate}` : '—'}
                  label="Uygunluk"
                  tint="bg-brand-50"
                />
              </View>

              <Pressable
                onPress={() => router.push('/audits')}
                className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center gap-3">
                  <ClipboardCheck size={22} color="#2563eb" />
                  <Text className="text-base font-semibold text-gray-800">Denetimler</Text>
                </View>
                <ChevronRight size={22} color="#9ca3af" />
              </Pressable>

              <Pressable
                onPress={() => router.push('/difs')}
                className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center gap-3">
                  <FileWarning size={22} color="#dc2626" />
                  <Text className="text-base font-semibold text-gray-800">DİF Kayıtları</Text>
                </View>
                <ChevronRight size={22} color="#9ca3af" />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  tint: string;
}

function SummaryCard({ icon, value, label, tint }: SummaryCardProps) {
  return (
    <View className={`flex-1 rounded-2xl ${tint} p-3`}>
      <View className="mb-1.5">{icon}</View>
      <Text className="text-2xl font-bold text-gray-800">{value}</Text>
      <Text className="mt-0.5 text-xs text-gray-500">{label}</Text>
    </View>
  );
}
