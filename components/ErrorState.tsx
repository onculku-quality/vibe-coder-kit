import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="mb-4">
        <AlertCircle size={48} color="#ef4444" />
      </View>
      <Text className="text-center text-base font-medium text-gray-700">{message}</Text>
      {onRetry ? (
        <View className="mt-6">
          <Button label="Tekrar Dene" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
