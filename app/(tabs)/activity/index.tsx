import { useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { History, User } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

export default function ActivityScreen() {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id ?? null;
  const logsQuery = useActivityLogs(institutionId);

  const logs = logsQuery.data ?? [];
  const onRefresh = useCallback(() => {
    logsQuery.refetch();
  }, [logsQuery]);

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

  if (logsQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingState label="Aktivite kayıtları yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (logsQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ErrorState
          message="Aktivite kayıtları yüklenemedi."
          onRetry={() => logsQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerClassName="px-5 py-5 gap-3"
        refreshControl={
          <RefreshControl
            refreshing={logsQuery.isRefetching}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        <Text className="text-2xl font-bold text-gray-800">Aktivite Logları</Text>
        <Text className="text-sm text-gray-500">
          Kurumunuzdaki son işlemler (en fazla 200 kayıt).
        </Text>

        {logs.length === 0 ? (
          <EmptyState
            icon={<History size={48} color="#9ca3af" />}
            title="Henüz kayıt yok"
            description="İşlemler yaptıkça burada görünür."
          />
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="gap-1.5">
              <View className="flex-row items-start gap-2">
                <View className="mt-0.5 h-2 w-2 rounded-full bg-brand-500" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">{log.action}</Text>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <User size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-500">
                      {log.actor_name ?? 'Bilinmeyen kullanıcı'}
                    </Text>
                  </View>
                  {log.target_type ? (
                    <Text className="mt-0.5 text-xs text-gray-400">
                      Hedef: {log.target_type}
                      {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ''}
                    </Text>
                  ) : null}
                  <Text className="mt-0.5 text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString('tr-TR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
