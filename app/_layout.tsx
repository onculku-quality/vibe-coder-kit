import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import { isSubscriptionLocked } from '@/lib/subscription';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { LockScreen } from '@/components/LockScreen';

function RootLayoutNav() {
  const { session, profile, institution, loading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return <LoadingState label="Hazırlanıyor..." />;
  }

  if (!profile && session) {
    return (
      <ErrorState
        message="Profil bilgisi bulunamadı. Hesabınız tam olarak oluşturulmamış olabilir."
        onRetry={signOut}
      />
    );
  }

  // Platform admin: abonelik kilidi ve kurum kontrolü uygulanmaz.
  if (profile?.role === 'platform_admini') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="platform/institutions"
          options={{ headerShown: true, title: 'Kurum Yönetimi' }}
        />
      </Stack>
    );
  }

  if (session && isSubscriptionLocked(profile, institution)) {
    return <LockScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="platform/institutions"
        options={{ headerShown: true, title: 'Kurum Yönetimi' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
