import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Mail, Shield, Building } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ROLES } from '@/constants/roles';

export default function ProfileScreen() {
  const { profile, session, institution, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const email = session?.user?.email ?? '-';

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      Alert.alert('Hata', 'Çıkış yapılamadı. Tekrar deneyin.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="px-5 py-6 gap-4">
        <Text className="text-2xl font-bold text-gray-800">Profil</Text>

        <Card className="gap-4">
          <InfoRow icon={<User size={20} color="#6b7280" />} label="Ad Soyad" value={profile?.name ?? '-'} />
          <InfoRow icon={<Mail size={20} color="#6b7280" />} label="E-posta" value={email} />
          <InfoRow icon={<Shield size={20} color="#6b7280" />} label="Rol" value={profile ? ROLES[profile.role] : '-'} />
          {institution && (
            <InfoRow icon={<Building size={20} color="#6b7280" />} label="Kurum" value={institution.name} />
          )}
        </Card>

        <Button
          label="Çıkış Yap"
          variant="danger"
          loading={signingOut}
          icon={<LogOut size={20} color="#fff" />}
          onPress={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      {icon}
      <View className="flex-1">
        <Text className="text-xs text-gray-400">{label}</Text>
        <Text className="text-base text-gray-800">{value}</Text>
      </View>
    </View>
  );
}
