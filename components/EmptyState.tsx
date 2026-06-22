import { View, Text } from 'react-native';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {icon ? <View className="mb-4 opacity-40">{icon}</View> : null}
      <Text className="text-center text-lg font-semibold text-gray-700">{title}</Text>
      {description ? (
        <Text className="mt-1.5 text-center text-sm text-gray-500">{description}</Text>
      ) : null}
      {action ? <View className="mt-6">{action}</View> : null}
    </View>
  );
}
