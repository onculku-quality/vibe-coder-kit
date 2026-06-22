import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Yükleniyor...' }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="text-sm text-gray-500">{label}</Text>
    </View>
  );
}
