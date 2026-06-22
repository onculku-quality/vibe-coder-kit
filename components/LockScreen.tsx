import { View, Text } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button } from './Button';
import { useAuth } from '@/lib/auth';

export function LockScreen() {
  const { signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6">
      <View className="mb-5">
        <Lock size={56} color="#ef4444" />
      </View>
      <Text className="text-xl font-bold text-gray-800">Aboneliğiniz Sona Erdi</Text>
      <Text className="mt-2 max-w-xs text-center text-base text-gray-500">
        Kurumunuzun aboneliği sona ermiştir. Lütfen kurum yöneticinizle veya platform
        yöneticisiyle iletişime geçin.
      </Text>
      <View className="mt-8 w-full max-w-xs">
        <Button label="Çıkış Yap" variant="secondary" onPress={signOut} />
      </View>
    </View>
  );
}
